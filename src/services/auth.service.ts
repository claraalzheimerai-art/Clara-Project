// ============================================================
// CLARA — Auth Service (MySQL / UserModel)
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { IUser, UserModel } from '../models/user.model';
import {
  AUTH_CONSTANTS,
  AuthResponse,
  ChangePasswordDto,
  JwtPayload,
  LoginDto,
  PublicUser,
  RegisterDto,
  toPublicUser,
} from '../types/auth.types';

// ── Refresh token store ──────────────────────────────────────
// En memoria por ahora — en producción migrar a Redis o tabla refresh_tokens
const refreshTokenStore = new Map<string, number>(); // refreshToken → userId

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado en .env');
  return secret;
}

function buildPayload(user: IUser): Omit<JwtPayload, 'iat' | 'exp'> {
  return { sub: user.id, email: user.email, rol: user.role, nombre: user.nombre };
}

function generateTokenPair(user: IUser): { token: string; refreshToken: string } {
  const token = jwt.sign(buildPayload(user), getJwtSecret(), {
    expiresIn: AUTH_CONSTANTS.TOKEN_EXPIRY,
  });
  const refreshToken = uuidv4();
  refreshTokenStore.set(refreshToken, user.id);
  return { token, refreshToken };
}

// ── Service ──────────────────────────────────────────────────
export const AuthService = {

  // ── Register ───────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existe = await UserModel.findByEmail(dto.email);
    if (existe) {
      const err = new Error('El correo ya está registrado');
      (err as any).statusCode = 409;
      throw err;
    }

    if (dto.password.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
      const err = new Error(
        `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const verificationToken = uuidv4();
    const user = await UserModel.create({
      nombre:             dto.nombre,
      apellido:           dto.apellido,
      email:              dto.email,
      password:           dto.password,       // UserModel.create ya hashea
      verification_token: verificationToken,
    });

    logger.info(`Nuevo usuario registrado: ${user.email} (id=${user.id})`);

    const { token, refreshToken } = generateTokenPair(user);
    return { token, refreshToken, user: toPublicUser(user) };
  },

  // ── Login ──────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await UserModel.findByEmail(dto.email);

    // Hash dummy para mantener tiempo constante aunque el usuario no exista
    const dummyHash = '$2a$12$invalidhashusedfortimingatk00000000000000000000000000';
    const passwordOk = await UserModel.comparePassword(
      dto.password,
      user?.password ?? dummyHash,
    );

    if (!user || !passwordOk) {
      const err = new Error('Credenciales inválidas');
      (err as any).statusCode = 401;
      throw err;
    }

    if (!user.email_verified) {
      const err = new Error('Debes verificar tu correo antes de iniciar sesión');
      (err as any).statusCode = 403;
      throw err;
    }

    logger.info(`Login exitoso: ${user.email}`);
    const { token, refreshToken } = generateTokenPair(user);
    return { token, refreshToken, user: toPublicUser(user) };
  },

  // ── Refresh Token ──────────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const userId = refreshTokenStore.get(refreshToken);
    if (userId === undefined) {
      const err = new Error('Refresh token inválido o expirado');
      (err as any).statusCode = 401;
      throw err;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      refreshTokenStore.delete(refreshToken);
      const err = new Error('Usuario no encontrado');
      (err as any).statusCode = 401;
      throw err;
    }

    const token = jwt.sign(buildPayload(user), getJwtSecret(), {
      expiresIn: AUTH_CONSTANTS.TOKEN_EXPIRY,
    });
    return { token };
  },

  // ── Logout ─────────────────────────────────────────────────
  async logout(refreshToken: string): Promise<void> {
    refreshTokenStore.delete(refreshToken);
  },

  // ── Cambio de contraseña ───────────────────────────────────
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      (err as any).statusCode = 404;
      throw err;
    }

    const match = await UserModel.comparePassword(dto.passwordActual, user.password);
    if (!match) {
      const err = new Error('La contraseña actual es incorrecta');
      (err as any).statusCode = 400;
      throw err;
    }

    if (dto.passwordNuevo.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
      const err = new Error(
        `La nueva contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Hashear manualmente porque UserModel.update recibe campos directos
    const passwordHash = await bcrypt.hash(dto.passwordNuevo, AUTH_CONSTANTS.BCRYPT_ROUNDS);
    await UserModel.update(userId, { password: passwordHash });
    logger.info(`Contraseña actualizada: userId=${userId}`);
  },

  // ── Perfil ─────────────────────────────────────────────────
  async getProfile(userId: number): Promise<PublicUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      (err as any).statusCode = 404;
      throw err;
    }
    return toPublicUser(user);
  },

  async updateProfile(
    userId: number,
    data: Partial<Pick<RegisterDto, 'nombre' | 'apellido' | 'especialidad' | 'institucion' | 'telefono'>>,
  ): Promise<PublicUser> {
    await UserModel.update(userId, data as any);
    const user = await UserModel.findById(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      (err as any).statusCode = 404;
      throw err;
    }
    return toPublicUser(user);
  },

  // ── Solo para tests ────────────────────────────────────────
  _clearRefreshTokens(): void {
    refreshTokenStore.clear();
  },
};
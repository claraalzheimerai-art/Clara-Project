import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel, IUser } from '../models/user.model';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterDTO {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

class AuthService {

  generateTokens(user: IUser): AuthTokens {
    const payload: TokenPayload = {
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not defined');

    const accessToken = jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'] }
    );

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET is not defined');

    const refreshToken = jwt.sign(
      { userId: user.id.toString() },
      jwtRefreshSecret,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  }

  verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
  }

  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(dto: RegisterDTO): Promise<IUser> {
    const exists = await UserModel.findByEmail(dto.email.toLowerCase());
    if (exists) throw new Error('El email ya está registrado');

    const verificationToken = this.generateVerificationToken();

    const user = await UserModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      verification_token: verificationToken,
    });

    logger.info(`Usuario registrado: ${user.email}`);
    return user;
  }

  async login(dto: LoginDTO): Promise<{ user: IUser; tokens: AuthTokens }> {
    const user = await UserModel.findByEmail(dto.email.toLowerCase());
    if (!user) throw new Error('Credenciales inválidas');

    const valid = await UserModel.comparePassword(dto.password, user.password);
    if (!valid) throw new Error('Credenciales inválidas');

    if (!user.email_verified) throw new Error('Debes verificar tu email antes de iniciar sesión');

    const tokens = this.generateTokens(user);
    logger.info(`Login exitoso: ${user.email}`);
    return { user, tokens };
  }

  async verifyEmail(token: string): Promise<IUser> {
    const user = await UserModel.findByVerificationToken(token);
    if (!user) throw new Error('Token de verificación inválido');

    await UserModel.update(user.id, {
      email_verified: true,
      verification_token: null,
    });

    logger.info(`Email verificado: ${user.email}`);
    return { ...user, email_verified: true, verification_token: null };
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await UserModel.findByEmail(email.toLowerCase());
    if (!user) throw new Error('Email no encontrado');

    const resetToken = this.generateResetToken();

    await UserModel.update(user.id, {
      reset_token: resetToken,
      reset_token_expiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    });

    logger.info(`Reset token generado para: ${user.email}`);
    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await UserModel.findByResetToken(token);
    if (!user) throw new Error('Token inválido o expirado');

    const salt = await import('bcryptjs').then(b => b.genSalt(12));
    const hashed = await import('bcryptjs').then(b => b.hash(newPassword, salt));

    await UserModel.update(user.id, {
      password: hashed,
      reset_token: null,
      reset_token_expiry: null,
    });

    logger.info(`Contraseña restablecida para: ${user.email}`);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(Number(payload.userId));
    if (!user) throw new Error('Usuario no encontrado');

    return this.generateTokens(user);
  }
}

export const authService = new AuthService();
export { AuthService };
// ============================================================
// CLARA — Auth Service Unit Tests
// Mock de UserModel para no requerir MySQL en tests
// ============================================================

import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-clara-2026';

jest.mock('../../models/user.model', () => ({
  UserModel: {
    findByEmail:     jest.fn(),
    findById:        jest.fn(),
    create:          jest.fn(),
    update:          jest.fn(),
    comparePassword: jest.fn(),
  },
}));

// { logger } — exportación nombrada, igual que en auth.service.ts
jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
  },
}));

import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

const mockFindByEmail     = UserModel.findByEmail     as jest.Mock;
const mockFindById        = UserModel.findById        as jest.Mock;
const mockCreate          = UserModel.create          as jest.Mock;
const mockUpdate          = UserModel.update          as jest.Mock;
const mockComparePassword = UserModel.comparePassword as jest.Mock;

function fakeUser(overrides = {}): any {
  return {
    id:                 1,
    nombre:             'Ana',
    apellido:           'López',
    email:              'ana@hospital.com',
    password:           '$2a$12$hashedpassword',
    role:               'medico',
    email_verified:     true,
    verification_token: null,
    reset_token:        null,
    reset_token_expiry: null,
    created_at:         new Date(),
    updated_at:         new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthService._clearRefreshTokens();
  });

  describe('register()', () => {
    it('registra un usuario nuevo y retorna token + publicUser', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());

      const result = await AuthService.register({
        nombre: 'Ana', apellido: 'López',
        email: 'ana@hospital.com', password: 'Segura123!',
      });

      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe('ana@hospital.com');
      expect((result.user as any).password).toBeUndefined();
      expect((result.user as any).verification_token).toBeUndefined();
    });

    it('el token contiene sub, email, rol y nombre', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser({ id: 42 }));

      const { token } = await AuthService.register({
        nombre: 'Ana', apellido: 'L', email: 'a@b.com', password: 'Password1!',
      });

      const decoded = jwt.verify(token, 'test-secret-clara-2026') as any;
      expect(decoded.sub).toBe(42);
      expect(decoded.rol).toBe('medico');
    });

    it('lanza 409 si el email ya existe en BD', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());

      await expect(
        AuthService.register({ nombre: 'X', apellido: 'X', email: 'dup@test.com', password: 'Pass1234!' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('lanza 400 si la contraseña tiene menos de 8 caracteres', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(
        AuthService.register({ nombre: 'X', apellido: 'X', email: 'x@x.com', password: '1234' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('llama a UserModel.create con verification_token', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());

      await AuthService.register({
        nombre: 'Ana', apellido: 'L', email: 'a@b.com', password: 'Password1!',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ verification_token: expect.any(String) }),
      );
    });
  });

  describe('login()', () => {
    it('retorna token con credenciales correctas', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(true);

      const result = await AuthService.login({ email: 'ana@hospital.com', password: 'Segura123!' });

      expect(result.token).toBeTruthy();
      expect(result.user.email).toBe('ana@hospital.com');
    });

    it('lanza 401 con contraseña incorrecta', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(false);

      await expect(
        AuthService.login({ email: 'ana@hospital.com', password: 'Incorrecta' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('lanza 401 con email inexistente (mismo mensaje que clave incorrecta)', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockComparePassword.mockResolvedValue(false);

      await expect(
        AuthService.login({ email: 'noexiste@hospital.com', password: 'cualquiera' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Credenciales inválidas' });
    });

    it('lanza 403 si email_verified es false', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser({ email_verified: false }));
      mockComparePassword.mockResolvedValue(true);

      await expect(
        AuthService.login({ email: 'ana@hospital.com', password: 'Segura123!' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('refreshToken()', () => {
    it('genera nuevo access token con refresh token válido', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());

      const { refreshToken } = await AuthService.register({
        nombre: 'R', apellido: 'T', email: 'r@t.com', password: 'Password1!',
      });

      mockFindById.mockResolvedValue(fakeUser());

      const result = await AuthService.refreshToken(refreshToken);
      expect(result.token).toBeTruthy();

      const decoded = jwt.verify(result.token, 'test-secret-clara-2026') as any;
      expect(decoded.email).toBe('ana@hospital.com');
    });

    it('lanza 401 con refresh token inválido', async () => {
      await expect(
        AuthService.refreshToken('uuid-que-no-existe'),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('lanza 401 si el usuario ya no existe en BD', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());

      const { refreshToken } = await AuthService.register({
        nombre: 'R', apellido: 'T', email: 'r@t.com', password: 'Password1!',
      });

      mockFindById.mockResolvedValue(null);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('logout()', () => {
    it('invalida el refresh token: no puede volver a usarse', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());

      const { refreshToken } = await AuthService.register({
        nombre: 'L', apellido: 'T', email: 'l@t.com', password: 'Password1!',
      });

      await AuthService.logout(refreshToken);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('no lanza error al hacer logout con token inexistente', async () => {
      await expect(AuthService.logout('token-falso')).resolves.toBeUndefined();
    });
  });

  describe('changePassword()', () => {
    it('actualiza la contraseña correctamente', async () => {
      mockFindById.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(true);
      mockUpdate.mockResolvedValue(undefined);

      await expect(
        AuthService.changePassword(1, { passwordActual: 'Vieja1!', passwordNuevo: 'Nueva1234!' }),
      ).resolves.toBeUndefined();

      expect(mockUpdate).toHaveBeenCalledWith(1, { password: expect.any(String) });
    });

    it('lanza 400 si la clave actual es incorrecta', async () => {
      mockFindById.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(false);

      await expect(
        AuthService.changePassword(1, { passwordActual: 'Mal', passwordNuevo: 'Nueva1234!' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si la nueva clave es muy corta', async () => {
      mockFindById.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(true);

      await expect(
        AuthService.changePassword(1, { passwordActual: 'Vieja1!', passwordNuevo: '123' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 404 si el usuario no existe', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        AuthService.changePassword(99, { passwordActual: 'X', passwordNuevo: 'Nueva1234!' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getProfile()', () => {
    it('retorna PublicUser sin campos sensibles', async () => {
      mockFindById.mockResolvedValue(fakeUser({ especialidad: 'Neurología' }));

      const profile = await AuthService.getProfile(1);

      expect(profile.nombre).toBe('Ana');
      expect((profile as any).password).toBeUndefined();
      expect((profile as any).verification_token).toBeUndefined();
      expect((profile as any).reset_token).toBeUndefined();
    });

    it('lanza 404 si el usuario no existe', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(AuthService.getProfile(99)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});

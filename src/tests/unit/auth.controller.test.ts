// ============================================================
// CLARA — Auth Controller Unit Tests (MySQL mock)
// ============================================================

import { NextFunction, Request, Response } from 'express';

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

jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
  },
}));

import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import {
  changePassword,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  updateMe,
} from '../../controllers/auth.controller';

const mockFindByEmail     = UserModel.findByEmail     as jest.Mock;
const mockFindById        = UserModel.findById        as jest.Mock;
const mockCreate          = UserModel.create          as jest.Mock;
const mockUpdate          = UserModel.update          as jest.Mock;
const mockComparePassword = UserModel.comparePassword as jest.Mock;

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function fakeUser(overrides = {}): any {
  return {
    id: 1, nombre: 'Doc', apellido: 'Test',
    email: 'doc@clara.com', password: '$2a$12$hash',
    role: 'medico', email_verified: true,
    verification_token: null, reset_token: null, reset_token_expiry: null,
    created_at: new Date(), updated_at: new Date(),
    ...overrides,
  };
}

describe('auth.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthService._clearRefreshTokens();
  });

  // ── register ───────────────────────────────────────────────
  describe('register()', () => {
    it('retorna 201 con token y publicUser', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());

      const req = {
        body: { nombre: 'Doc', apellido: 'Test', email: 'doc@clara.com', password: 'Segura123!' },
      } as Request;
      const res = mockRes();
      const next = jest.fn() as NextFunction;

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ token: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('llama next(error) si el correo ya existe (409)', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());

      const req = {
        body: { nombre: 'X', apellido: 'X', email: 'dup@test.com', password: 'Pass1234!' },
      } as Request;
      const next = jest.fn() as NextFunction;

      await register(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    });
  });

  // ── login ──────────────────────────────────────────────────
  describe('login()', () => {
    it('retorna 200 con token en login exitoso', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(true);

      const req = { body: { email: 'doc@clara.com', password: 'Segura123!' } } as Request;
      const res = mockRes();

      await login(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ token: expect.any(String) }) }),
      );
    });

    it('llama next(error) con credenciales incorrectas (401)', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(false);

      const req = { body: { email: 'doc@clara.com', password: 'Mal' } } as Request;
      const next = jest.fn() as NextFunction;

      await login(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('llama next(error) si email no verificado (403)', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser({ email_verified: false }));
      mockComparePassword.mockResolvedValue(true);

      const req = { body: { email: 'doc@clara.com', password: 'Segura123!' } } as Request;
      const next = jest.fn() as NextFunction;

      await login(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  // ── refreshToken ───────────────────────────────────────────
  describe('refreshToken()', () => {
    it('retorna 400 si no se envía refreshToken', async () => {
      const req = { body: {} } as Request;
      const res = mockRes();

      await refreshToken(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 con nuevo token si refreshToken es válido', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser());
      const { refreshToken: rt } = await AuthService.register({
        nombre: 'R', apellido: 'T', email: 'r@t.com', password: 'Password1!',
      });

      mockFindById.mockResolvedValue(fakeUser());

      const req = { body: { refreshToken: rt } } as Request;
      const res = mockRes();

      await refreshToken(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── logout ─────────────────────────────────────────────────
  describe('logout()', () => {
    it('retorna 200 siempre (idempotente)', async () => {
      const req = { body: { refreshToken: 'cualquier-token' } } as Request;
      const res = mockRes();

      await logout(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── getMe ──────────────────────────────────────────────────
  describe('getMe()', () => {
    it('retorna perfil del usuario autenticado', async () => {
      mockFindById.mockResolvedValue(fakeUser());

      const req = { user: { sub: 1, email: 'doc@clara.com', rol: 'medico', nombre: 'Doc' } } as any;
      const res = mockRes();

      await getMe(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'doc@clara.com' }) }),
      );
    });
  });

  // ── changePassword ─────────────────────────────────────────
  describe('changePassword()', () => {
    it('retorna 200 al cambiar contraseña correctamente', async () => {
      mockFindById.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(true);
      mockUpdate.mockResolvedValue(undefined);

      const req = {
        user: { sub: 1, email: 'doc@clara.com', rol: 'medico', nombre: 'Doc' },
        body: { passwordActual: 'Vieja1234!', passwordNuevo: 'Nueva5678!' },
      } as any;
      const res = mockRes();

      await changePassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('llama next(error) si la clave actual es incorrecta', async () => {
      mockFindById.mockResolvedValue(fakeUser());
      mockComparePassword.mockResolvedValue(false);

      const req = {
        user: { sub: 1 },
        body: { passwordActual: 'Mal', passwordNuevo: 'Nueva5678!' },
      } as any;
      const next = jest.fn() as NextFunction;

      await changePassword(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });
});
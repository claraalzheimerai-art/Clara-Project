// ============================================================
// CLARA — Reset Password Controller Unit Tests
// ============================================================

jest.mock('../../models/user.model', () => ({
  UserModel: {
    findByEmail:      jest.fn(),
    findByResetToken: jest.fn(),
    update:           jest.fn(),
  },
}));

jest.mock('../../services/email.service', () => ({
  EmailService: {
    sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('reset-token-uuid-123') }));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedNewPassword'),
}));

import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../../models/user.model';
import { EmailService } from '../../services/email.service';
import {
  forgotPassword,
  resetPassword,
} from '../../controllers/reset.password.controller';

const mockFindByEmail      = UserModel.findByEmail      as jest.Mock;
const mockFindByResetToken = UserModel.findByResetToken as jest.Mock;
const mockUpdate           = UserModel.update           as jest.Mock;
const mockSendReset        = EmailService.sendResetPasswordEmail as jest.Mock;

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function fakeUser(overrides = {}): any {
  return {
    id:    1,
    nombre: 'Ana',
    apellido: 'López',
    email: 'ana@hospital.com',
    email_verified:     true,
    reset_token:        null,
    reset_token_expiry: null,
    ...overrides,
  };
}

describe('reset.password.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── forgotPassword() ──────────────────────────────────────
  describe('forgotPassword()', () => {
    it('genera token, actualiza BD y envía email', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockUpdate.mockResolvedValue(undefined);

      const req = { body: { email: 'ana@hospital.com' } } as Request;
      const res = mockRes();

      await forgotPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);

      // Debe guardar el token y su expiración en BD
      expect(mockUpdate).toHaveBeenCalledWith(1, {
        reset_token:        'reset-token-uuid-123',
        reset_token_expiry: expect.any(Date),
      });

      // La fecha de expiración debe ser futura (~1 hora)
      const updateCall = mockUpdate.mock.calls[0][1];
      expect(updateCall.reset_token_expiry.getTime()).toBeGreaterThan(Date.now());

      // Debe enviar el email con el token
      expect(mockSendReset).toHaveBeenCalledWith(
        expect.objectContaining({
          to:    'ana@hospital.com',
          token: 'reset-token-uuid-123',
        }),
      );
    });

    it('retorna 200 genérico si el email NO existe (no revela información)', async () => {
      mockFindByEmail.mockResolvedValue(null);

      const req = { body: { email: 'noexiste@test.com' } } as Request;
      const res = mockRes();

      await forgotPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      // No debe tocar la BD ni enviar email
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSendReset).not.toHaveBeenCalled();
    });

    it('el mensaje de respuesta es igual exista o no el usuario', async () => {
      // Con usuario existente
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockUpdate.mockResolvedValue(undefined);
      const req1 = { body: { email: 'ana@hospital.com' } } as Request;
      const res1 = mockRes();
      await forgotPassword(req1, res1, jest.fn());
      const body1 = (res1.json as jest.Mock).mock.calls[0][0];

      // Sin usuario
      mockFindByEmail.mockResolvedValue(null);
      const req2 = { body: { email: 'noexiste@test.com' } } as Request;
      const res2 = mockRes();
      await forgotPassword(req2, res2, jest.fn());
      const body2 = (res2.json as jest.Mock).mock.calls[0][0];

      // Mismo mensaje — el atacante no puede distinguir
      expect(body1.data.message).toBe(body2.data.message);
    });

    it('retorna 400 si no se envía email', async () => {
      const req = { body: {} } as Request;
      const res = mockRes();

      await forgotPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('llama next(error) si la BD falla', async () => {
      mockFindByEmail.mockRejectedValue(new Error('DB connection lost'));

      const req  = { body: { email: 'ana@hospital.com' } } as Request;
      const next = jest.fn() as NextFunction;

      await forgotPassword(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── resetPassword() ───────────────────────────────────────
  describe('resetPassword()', () => {
    it('actualiza la contraseña e invalida el token', async () => {
      mockFindByResetToken.mockResolvedValue(fakeUser({ reset_token: 'reset-token-uuid-123' }));
      mockUpdate.mockResolvedValue(undefined);

      const req = {
        body: { token: 'reset-token-uuid-123', password: 'NuevaClave123!' },
      } as Request;
      const res = mockRes();

      await resetPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);

      // Debe guardar la nueva clave hasheada y limpiar los tokens
      expect(mockUpdate).toHaveBeenCalledWith(1, {
        password:           '$2a$12$hashedNewPassword',
        reset_token:        null,
        reset_token_expiry: null,
      });
    });

    it('retorna 400 si el token no existe o está expirado', async () => {
      // findByResetToken retorna null cuando el token expiró (la query filtra por expiry > NOW())
      mockFindByResetToken.mockResolvedValue(null);

      const req = {
        body: { token: 'token-expirado-o-invalido', password: 'NuevaClave123!' },
      } as Request;
      const res = mockRes();

      await resetPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('inválido o ha expirado') }),
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('retorna 400 si la contraseña tiene menos de 8 caracteres', async () => {
      const req = {
        body: { token: 'cualquier-token', password: '123' },
      } as Request;
      const res = mockRes();

      await resetPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockFindByResetToken).not.toHaveBeenCalled();
    });

    it('retorna 400 si no se envía token', async () => {
      const req = { body: { password: 'NuevaClave123!' } } as Request;
      const res = mockRes();

      await resetPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 si no se envía password', async () => {
      const req = { body: { token: 'cualquier-token' } } as Request;
      const res = mockRes();

      await resetPassword(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('el token queda inutilizable después de usarse', async () => {
      mockFindByResetToken.mockResolvedValue(fakeUser({ reset_token: 'token-valido' }));
      mockUpdate.mockResolvedValue(undefined);

      const req = { body: { token: 'token-valido', password: 'NuevaClave123!' } } as Request;
      await resetPassword(req, mockRes(), jest.fn());

      // Verifica que update pone null en ambos campos de token
      const updateArgs = mockUpdate.mock.calls[0][1];
      expect(updateArgs.reset_token).toBeNull();
      expect(updateArgs.reset_token_expiry).toBeNull();
    });

    it('llama next(error) si la BD falla', async () => {
      mockFindByResetToken.mockRejectedValue(new Error('DB error'));

      const req  = { body: { token: 'token', password: 'NuevaClave123!' } } as Request;
      const next = jest.fn() as NextFunction;

      await resetPassword(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
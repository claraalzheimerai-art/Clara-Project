// ============================================================
// CLARA — Email Verification Controller Unit Tests
// ============================================================

jest.mock('../../models/user.model', () => ({
  UserModel: {
    findByVerificationToken: jest.fn(),
    findByEmail:             jest.fn(),
    update:                  jest.fn(),
  },
}));

jest.mock('../../services/email.service', () => ({
  EmailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('nuevo-token-uuid') }));

import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../../models/user.model';
import { EmailService } from '../../services/email.service';
import {
  verifyEmail,
  resendVerification,
} from '../../controllers/email.verification.controller';

const mockFindByToken = UserModel.findByVerificationToken as jest.Mock;
const mockFindByEmail = UserModel.findByEmail             as jest.Mock;
const mockUpdate      = UserModel.update                  as jest.Mock;
const mockSendVerif   = EmailService.sendVerificationEmail as jest.Mock;

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function fakeUser(overrides = {}): any {
  return {
    id: 1, nombre: 'Ana', apellido: 'López',
    email: 'ana@hospital.com', email_verified: false,
    verification_token: 'token-valido-uuid',
    ...overrides,
  };
}

describe('email.verification.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── verifyEmail() ─────────────────────────────────────────
  describe('verifyEmail()', () => {
    it('retorna 200 y activa la cuenta con token válido', async () => {
      mockFindByToken.mockResolvedValue(fakeUser());
      mockUpdate.mockResolvedValue(undefined);

      const req = { query: { token: 'token-valido-uuid' } } as any;
      const res = mockRes();

      await verifyEmail(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ email: 'ana@hospital.com' }),
        }),
      );
      // Debe nullificar el token y marcar email_verified
      expect(mockUpdate).toHaveBeenCalledWith(1, {
        email_verified:     true,
        verification_token: null,
      });
    });

    it('retorna 400 si no se pasa token', async () => {
      const req = { query: {} } as any;
      const res = mockRes();

      await verifyEmail(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('retorna 400 si el token no existe en BD', async () => {
      mockFindByToken.mockResolvedValue(null);

      const req = { query: { token: 'token-inexistente' } } as any;
      const res = mockRes();

      await verifyEmail(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('retorna 200 con mensaje especial si ya estaba verificado', async () => {
      mockFindByToken.mockResolvedValue(fakeUser({ email_verified: true }));

      const req = { query: { token: 'token-valido-uuid' } } as any;
      const res = mockRes();

      await verifyEmail(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ message: expect.stringContaining('ya estaba verificada') }),
        }),
      );
      // No debe llamar a update si ya estaba verificado
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('llama next(error) si la BD falla', async () => {
      mockFindByToken.mockRejectedValue(new Error('DB error'));

      const req  = { query: { token: 'cualquier' } } as any;
      const next = jest.fn() as NextFunction;

      await verifyEmail(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── resendVerification() ──────────────────────────────────
  describe('resendVerification()', () => {
    it('envía nuevo email y retorna 200 con mensaje genérico', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser());
      mockUpdate.mockResolvedValue(undefined);

      const req = { body: { email: 'ana@hospital.com' } } as any;
      const res = mockRes();

      await resendVerification(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockUpdate).toHaveBeenCalledWith(1, { verification_token: 'nuevo-token-uuid' });
      expect(mockSendVerif).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'nuevo-token-uuid', to: 'ana@hospital.com' }),
      );
    });

    it('retorna 200 genérico si el email no existe (no revela info)', async () => {
      mockFindByEmail.mockResolvedValue(null);

      const req = { body: { email: 'noexiste@test.com' } } as any;
      const res = mockRes();

      await resendVerification(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSendVerif).not.toHaveBeenCalled();
    });

    it('retorna 200 genérico si el email ya estaba verificado', async () => {
      mockFindByEmail.mockResolvedValue(fakeUser({ email_verified: true }));

      const req = { body: { email: 'ana@hospital.com' } } as any;
      const res = mockRes();

      await resendVerification(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSendVerif).not.toHaveBeenCalled();
    });

    it('retorna 400 si no se pasa email', async () => {
      const req = { body: {} } as any;
      const res = mockRes();

      await resendVerification(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('llama next(error) si la BD falla', async () => {
      mockFindByEmail.mockRejectedValue(new Error('DB error'));

      const req  = { body: { email: 'test@test.com' } } as any;
      const next = jest.fn() as NextFunction;

      await resendVerification(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
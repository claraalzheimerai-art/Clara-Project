// ============================================================
// CLARA — Email Service Unit Tests
// Mock de nodemailer — no envía emails reales en tests
// ============================================================

// Mock ANTES de imports
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id-123',
      accepted:  ['test@example.com'],
    }),
  }),
  getTestMessageUrl: jest.fn().mockReturnValue('https://ethereal.email/message/test'),
  createTestAccount: jest.fn().mockResolvedValue({
    user: 'test@ethereal.email',
    pass: 'testpass',
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import nodemailer from 'nodemailer';
import { EmailService } from '../../services/email.service';

const mockSendMail      = (nodemailer.createTransport as jest.Mock)().sendMail as jest.Mock;
const mockCreateTransport = nodemailer.createTransport as jest.Mock;

describe('EmailService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── sendVerificationEmail() ───────────────────────────────
  describe('sendVerificationEmail()', () => {
    it('llama a sendMail con los campos correctos', async () => {
      const result = await EmailService.sendVerificationEmail({
        to:     'medico@hospital.com',
        nombre: 'Dra. Ana',
        token:  'token-uuid-123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-123');
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to:      'medico@hospital.com',
          subject: expect.stringContaining('Verifica'),
          html:    expect.stringContaining('token-uuid-123'),
        }),
      );
    });

    it('el HTML del email contiene el nombre del usuario', async () => {
      await EmailService.sendVerificationEmail({
        to:     'test@test.com',
        nombre: 'Dr. García',
        token:  'abc123',
      });

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Dr. García');
    });

    it('el HTML contiene el token en la URL', async () => {
      await EmailService.sendVerificationEmail({
        to:     'test@test.com',
        nombre: 'X',
        token:  'mi-token-especial',
      });

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('mi-token-especial');
    });

    it('retorna success:false si sendMail lanza error', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const result = await EmailService.sendVerificationEmail({
        to:     'test@test.com',
        nombre: 'X',
        token:  'token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP connection failed');
    });
  });

  // ── sendResetPasswordEmail() ──────────────────────────────
  describe('sendResetPasswordEmail()', () => {
    it('envía email de reset con token en el HTML', async () => {
      const result = await EmailService.sendResetPasswordEmail({
        to:     'medico@hospital.com',
        nombre: 'Dr. López',
        token:  'reset-token-456',
      });

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('reset-token-456');
      expect(callArgs.html).toContain('Dr. López');
      expect(callArgs.subject).toContain('contraseña');
    });

    it('retorna success:false si sendMail falla', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Timeout'));

      const result = await EmailService.sendResetPasswordEmail({
        to:     'test@test.com',
        nombre: 'X',
        token:  'token',
      });

      expect(result.success).toBe(false);
    });
  });

  // ── createEtherealAccount() ───────────────────────────────
  describe('createEtherealAccount()', () => {
    it('retorna user y pass de Ethereal', async () => {
      const account = await EmailService.createEtherealAccount();

      expect(account.user).toBe('test@ethereal.email');
      expect(account.pass).toBe('testpass');
    });
  });
});
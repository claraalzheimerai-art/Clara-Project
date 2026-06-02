// ============================================================
// CLARA — Auth Validation Middleware Unit Tests
// ============================================================

import { Request, Response, NextFunction } from 'express';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
} from '../../middlewares/auth.validation.middleware';

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext(): NextFunction {
  return jest.fn();
}

describe('auth.validation.middleware', () => {

  // ── validateRegister ───────────────────────────────────────
  // Solo valida: nombre, email, password (apellido NO es requerido)
  describe('validateRegister', () => {
    it('llama next() con nombre, email y password válidos', () => {
      const req  = { body: { nombre: 'Ana', email: 'ana@test.com', password: 'Segura123!' } } as Request;
      const next = mockNext();
      validateRegister(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('llama next() aunque falte apellido (no es requerido)', () => {
      const req  = { body: { nombre: 'Ana', email: 'ana@test.com', password: 'Segura123!' } } as Request;
      const next = mockNext();
      validateRegister(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('responde 400 si falta nombre', () => {
      const req = { body: { email: 'a@test.com', password: 'Segura123!' } } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si falta email', () => {
      const req = { body: { nombre: 'Ana', password: 'Segura123!' } } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si falta password', () => {
      const req = { body: { nombre: 'Ana', email: 'a@test.com' } } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si nombre tiene menos de 2 caracteres', () => {
      const req = { body: { nombre: 'A', email: 'a@test.com', password: 'Segura123!' } } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si el email no tiene formato válido', () => {
      const req = { body: { nombre: 'Ana', email: 'noesemail', password: 'Segura123!' } } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si la contraseña tiene menos de 8 caracteres', () => {
      const req = { body: { nombre: 'Ana', email: 'a@test.com', password: '123' } } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si el body está vacío', () => {
      const req = { body: {} } as Request;
      const res = mockRes();
      validateRegister(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── validateLogin ──────────────────────────────────────────
  describe('validateLogin', () => {
    it('llama next() con email y password válidos', () => {
      const req  = { body: { email: 'doc@clara.com', password: 'cualquiera' } } as Request;
      const next = mockNext();
      validateLogin(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('responde 400 si faltan email y password', () => {
      const req = { body: {} } as Request;
      const res = mockRes();
      validateLogin(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si falta el email', () => {
      const req = { body: { password: 'clave123' } } as Request;
      const res = mockRes();
      validateLogin(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si falta la contraseña', () => {
      const req = { body: { email: 'doc@clara.com' } } as Request;
      const res = mockRes();
      validateLogin(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si el email no es válido', () => {
      const req = { body: { email: 'noesemail', password: 'clave123' } } as Request;
      const res = mockRes();
      validateLogin(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── validateChangePassword ─────────────────────────────────
  // Usa currentPassword / newPassword (no passwordActual / passwordNuevo)
  describe('validateChangePassword', () => {
    it('llama next() con currentPassword y newPassword válidos', () => {
      const req  = { body: { currentPassword: 'Vieja1234!', newPassword: 'Nueva5678!' } } as Request;
      const next = mockNext();
      validateChangePassword(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('responde 400 si falta currentPassword', () => {
      const req = { body: { newPassword: 'Nueva5678!' } } as Request;
      const res = mockRes();
      validateChangePassword(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si falta newPassword', () => {
      const req = { body: { currentPassword: 'Vieja1234!' } } as Request;
      const res = mockRes();
      validateChangePassword(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si newPassword tiene menos de 8 caracteres', () => {
      const req = { body: { currentPassword: 'Vieja1234!', newPassword: '123' } } as Request;
      const res = mockRes();
      validateChangePassword(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si newPassword es igual a currentPassword', () => {
      const req = { body: { currentPassword: 'MismaClave1!', newPassword: 'MismaClave1!' } } as Request;
      const res = mockRes();
      validateChangePassword(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde 400 si el body está vacío', () => {
      const req = { body: {} } as Request;
      const res = mockRes();
      validateChangePassword(req, res, mockNext());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
// ============================================================
// CLARA — JWT Middleware Unit Tests
// ============================================================

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../../middlewares/jwt.middleware';

process.env.JWT_SECRET = 'test-secret-clara-2026';

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function validToken(overrides = {}) {
  return jwt.sign(
    { sub: 1, email: 'doc@clara.com', rol: 'medico', nombre: 'Doc', ...overrides },
    'test-secret-clara-2026',
    { expiresIn: '1h' },
  );
}

describe('jwt.middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('authenticate', () => {
    it('llama next() y adjunta req.user con token válido', () => {
      const token = validToken();
      const req   = { headers: { authorization: `Bearer ${token}` } } as Request;
      const next  = jest.fn() as NextFunction;

      authenticate(req, mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user?.email).toBe('doc@clara.com');
      expect(req.user?.sub).toBe(1);
    });

    it('responde 401 sin Authorization header', () => {
      const req = { headers: {} } as Request;
      const res = mockRes();

      authenticate(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('responde 401 con header no-Bearer', () => {
      const req = { headers: { authorization: 'Basic abc123' } } as Request;
      const res = mockRes();

      authenticate(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('responde 401 "Token inválido" con firma incorrecta', () => {
      const badToken = jwt.sign({ sub: 1 }, 'otra-clave');
      const req = { headers: { authorization: `Bearer ${badToken}` } } as Request;
      const res = mockRes();

      authenticate(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Token inválido' }),
      );
    });

    it('responde 401 "Token expirado" con token vencido', () => {
      const expired = jwt.sign(
        { sub: 1, email: 'x', rol: 'medico', nombre: 'X' },
        'test-secret-clara-2026',
        { expiresIn: -1 },
      );
      const req = { headers: { authorization: `Bearer ${expired}` } } as Request;
      const res = mockRes();

      authenticate(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Token expirado' }),
      );
    });
  });

  describe('authorize', () => {
    it('llama next() si el rol está permitido', () => {
      const req  = { user: { sub: 1, email: 'x', rol: 'admin', nombre: 'X' } } as any;
      const next = jest.fn() as NextFunction;

      authorize('admin')(req, mockRes(), next);

      expect(next).toHaveBeenCalled();
    });

    it('responde 403 si el rol no está permitido', () => {
      const req = { user: { sub: 1, email: 'x', rol: 'medico', nombre: 'X' } } as any;
      const res = mockRes();

      authorize('admin')(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('responde 401 si no hay req.user', () => {
      const req = { headers: {} } as Request;
      const res = mockRes();

      authorize('medico')(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('acepta múltiples roles', () => {
      const req  = { user: { sub: 1, email: 'x', rol: 'medico', nombre: 'X' } } as any;
      const next = jest.fn() as NextFunction;

      authorize('medico', 'admin')(req, mockRes(), next);

      expect(next).toHaveBeenCalled();
    });
  });
});
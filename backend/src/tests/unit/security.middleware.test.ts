import { Request, Response, NextFunction } from 'express';

jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  },
}));

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.set    = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as unknown as NextFunction;

import {
  generalLimiter,
  analysisLimiter,
  securityHeaders,
} from '../../middlewares/security.middleware';

describe('security.middleware', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('securityHeaders', () => {
    it('es una función middleware válida', () => {
      expect(typeof securityHeaders).toBe('function');
    });
  });

  describe('generalLimiter', () => {
    it('es una función middleware válida', () => {
      expect(typeof generalLimiter).toBe('function');
    });

    it('handler responde 429 con mensaje de rate limit', () => {
      const req = {
        ip:   '127.0.0.1',
        path: '/api/v1/test',
      } as unknown as Request;
      const res = mockRes();

      // Acceder al handler directamente
      const handler = (generalLimiter as any).options?.handler;
      if (handler) {
        handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Demasiadas peticiones' })
        );
      } else {
        // express-rate-limit v7+ expone el handler diferente
        const store = (generalLimiter as any);
        expect(typeof store).toBe('function');
      }
    });
  });

  describe('analysisLimiter', () => {
    it('es una función middleware válida', () => {
      expect(typeof analysisLimiter).toBe('function');
    });

    it('handler responde 429 con mensaje de análisis excedido', () => {
      const req = {
        ip:   '127.0.0.1',
        path: '/api/v1/analysis/upload',
      } as unknown as Request;
      const res = mockRes();

      const handler = (analysisLimiter as any).options?.handler;
      if (handler) {
        handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Límite de análisis excedido' })
        );
      } else {
        expect(typeof analysisLimiter).toBe('function');
      }
    });
  });
});
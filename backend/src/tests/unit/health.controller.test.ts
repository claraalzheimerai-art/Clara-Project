jest.mock('../../services/ai.service', () => ({
  aiService: {
    health:  jest.fn(),
    predict: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { aiService } from '../../services/ai.service';
import { healthCheck } from '../../controllers/health.controller';

const mockedAiService = aiService as jest.Mocked<typeof aiService>;

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as unknown as NextFunction;

describe('health.controller', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('healthCheck()', () => {
    it('retorna 200 con status ok cuando AI Service responde', async () => {
      const mockHealth = {
        status: 'ok', service: 'clara-ai-service',
        version: '1.0.0', env: 'development', device: 'cpu',
      };
      mockedAiService.health.mockResolvedValue(mockHealth);

      const req = {} as Request;
      const res = mockRes();

      await healthCheck(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        status:     'ok',
        backend:    'clara-backend',
        ai_service: mockHealth,
      });
    });

    it('retorna 503 cuando AI Service no está disponible', async () => {
      mockedAiService.health.mockRejectedValue(new Error('ECONNREFUSED'));

      const req = {} as Request;
      const res = mockRes();

      await healthCheck(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        status:     'degraded',
        backend:    'clara-backend',
        ai_service: 'no disponible',
      });
    });
  });
});
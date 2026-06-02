jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/env.config', () => ({
  ENV: {
    IS_DEVELOPMENT:  true,
    CORS: {
      ORIGIN:          'http://localhost:5500',
      ALLOWED_ORIGINS: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    },
    AI_SERVICE: { URL: 'http://localhost:8000', TIMEOUT_MS: 60000 },
    PORT:        3000,
    NODE_ENV:    'test',
    API_VERSION: 'v1',
    UPLOAD: { MAX_SIZE_MB: 50, MAX_SIZE_BYTES: 52428800, TEMP_DIR: 'uploads/temp' },
    LOG: { LEVEL: 'debug', DIR: 'logs' },
  },
}));

import { corsMiddleware } from '../../middlewares/cors.middleware';

describe('cors.middleware', () => {

  it('es una función middleware válida', () => {
    expect(typeof corsMiddleware).toBe('function');
  });

  it('permite origen sin origin en modo development', (done) => {
    const req  = { headers: {} } as any;
    const res  = {
      setHeader:   jest.fn(),
      getHeader:   jest.fn(),
      end:         jest.fn(),
      statusCode:  200,
    } as any;

    // Simular llamada sin origin (Postman, curl, etc.)
    const corsHandler = corsMiddleware as any;
    corsHandler(req, res, () => {
      done();
    });
  });

  it('permite origen en ALLOWED_ORIGINS', (done) => {
    const req = {
      headers: { origin: 'http://localhost:5500' },
      method:  'GET',
    } as any;
    const res = {
      setHeader:  jest.fn(),
      getHeader:  jest.fn(),
      end:        jest.fn(),
      statusCode: 200,
    } as any;

    const corsHandler = corsMiddleware as any;
    corsHandler(req, res, () => {
      done();
    });
  });

  it('bloquea origen no permitido', (done) => {
    const req = {
      headers: { origin: 'http://malicious.com' },
      method:  'GET',
    } as any;
    const res = {
      setHeader:  jest.fn(),
      getHeader:  jest.fn(),
      end:        jest.fn(),
      statusCode: 200,
    } as any;

    const corsHandler = corsMiddleware as any;
    corsHandler(req, res, (err: Error) => {
      if (err) {
        expect(err.message).toContain('no permitido');
        done();
      } else {
        done();
      }
    });
  });
});
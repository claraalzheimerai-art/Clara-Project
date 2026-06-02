import request from 'supertest';
import app from '../../app';

describe('Security Headers (helmet)', () => {

  it('incluye X-Content-Type-Options', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('incluye X-Frame-Options', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('incluye X-XSS-Protection o Content-Security-Policy', async () => {
    const res = await request(app).get('/');
    const hasXss = res.headers['x-xss-protection'] !== undefined;
    const hasCsp = res.headers['content-security-policy'] !== undefined;
    expect(hasXss || hasCsp).toBe(true);
  });

  it('no expone X-Powered-By', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Rate Limiting', () => {

  it('incluye headers de rate limit en respuestas', async () => {
    const res = await request(app).get('/api/v1/analysis/health');
    expect(
      res.headers['ratelimit-limit'] ||
      res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });

  it('retorna 404 para rutas inexistentes con headers de seguridad', async () => {
    const res = await request(app).get('/ruta-no-existe');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
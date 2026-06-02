import request from 'supertest';
import app from '../../app';

describe('GET /api/v1/analysis/health', () => {
  it('responde 200 o 503 según disponibilidad del AI Service', async () => {
    const res = await request(app).get('/api/v1/analysis/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('backend', 'clara-backend');
    expect(res.body).toHaveProperty('ai_service');
  });

  it('incluye campo ai_service en la respuesta', async () => {
    const res = await request(app).get('/api/v1/analysis/health');
    expect(res.body).toHaveProperty('ai_service');
  });

  it('cuando AI Service no está disponible retorna status degraded', async () => {
    const res = await request(app).get('/api/v1/analysis/health');
    if (res.status === 503) {
      expect(res.body.status).toBe('degraded');
    } else {
      expect(res.body.status).toBe('ok');
    }
  });
});

describe('GET /', () => {
  it('responde 200 con info del API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('CLARA Backend API');
    expect(res.body.version).toBe('v1');
  });
});

describe('GET /ruta-inexistente', () => {
  it('responde 404', async () => {
    const res = await request(app).get('/ruta-que-no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/analysis/upload', () => {
  it('responde 400 si no se envía archivo', async () => {
    const res = await request(app).post('/api/v1/analysis/upload');
    expect(res.status).toBe(400);
  });
});
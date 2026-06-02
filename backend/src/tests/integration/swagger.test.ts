import request from 'supertest';
import app from '../../app';

describe('Swagger Documentation', () => {

  describe('GET /api-docs.json', () => {
    it('retorna el spec OpenAPI en JSON', async () => {
      const res = await request(app).get('/api-docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info.title).toBe('CLARA Backend API');
      expect(res.body.info.version).toBe('1.0.0');
    });

    it('incluye los schemas de CLARA', async () => {
      const res = await request(app).get('/api-docs.json');
      const schemas = res.body.components.schemas;
      expect(schemas).toHaveProperty('DiagnosticLabel');
      expect(schemas).toHaveProperty('AnalysisResult');
      expect(schemas).toHaveProperty('Prediction');
      expect(schemas).toHaveProperty('HealthResponse');
      expect(schemas).toHaveProperty('ApiResponse');
    });

    it('incluye los endpoints documentados', async () => {
      const res = await request(app).get('/api-docs.json');
      const paths = res.body.paths;
      expect(paths).toHaveProperty('/analysis/health');
      expect(paths).toHaveProperty('/analysis/upload');
    });

    it('DiagnosticLabel tiene los 3 valores CN/MCI/AD', async () => {
      const res = await request(app).get('/api-docs.json');
      const label = res.body.components.schemas.DiagnosticLabel;
      expect(label.enum).toContain('CN');
      expect(label.enum).toContain('MCI');
      expect(label.enum).toContain('AD');
    });
  });

  describe('GET /api-docs', () => {
    it('retorna la UI de Swagger', async () => {
      const res = await request(app).get('/api-docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger');
    });
  });
});
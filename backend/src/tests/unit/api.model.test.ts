import { successResponse, errorResponse } from '../../models/api.model';

describe('api.model', () => {

  describe('successResponse', () => {
    it('retorna success: true con data', () => {
      const res = successResponse({ label: 'CN' });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ label: 'CN' });
      expect(res.error).toBeUndefined();
    });

    it('incluye meta con timestamp', () => {
      const res = successResponse({});
      expect(res.meta?.timestamp).toBeDefined();
      expect(typeof res.meta?.timestamp).toBe('string');
    });

    it('acepta meta parcial', () => {
      const res = successResponse({}, { version: '2.0.0' });
      expect(res.meta?.version).toBe('2.0.0');
    });
  });

  describe('errorResponse', () => {
    it('retorna success: false con mensaje', () => {
      const res = errorResponse('Algo falló');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Algo falló');
      expect(res.data).toBeUndefined();
    });

    it('incluye meta con timestamp', () => {
      const res = errorResponse('Error');
      expect(res.meta?.timestamp).toBeDefined();
    });
  });
});
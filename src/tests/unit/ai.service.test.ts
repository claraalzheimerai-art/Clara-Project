const mockGet  = jest.fn();
const mockPost = jest.fn();

const mockClient = {
  get:      mockGet,
  post:     mockPost,
  defaults: { baseURL: 'http://localhost:8000' },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockClient),
  },
}));

jest.mock('fs', () => ({
  createReadStream: jest.fn().mockReturnValue('mock-stream'),
}));

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append:     jest.fn(),
    getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
  }));
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  },
}));

import { AIService } from '../../services/ai.service';

describe('AIService', () => {

  let service: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AIService();
  });

  describe('health()', () => {
    it('retorna health data cuando AI Service responde', async () => {
      const mockHealth = {
        status:  'ok',
        service: 'clara-ai-service',
        version: '1.0.0',
        env:     'development',
        device:  'cpu',
      };
      mockGet.mockResolvedValue({ data: mockHealth });

      const result = await service.health();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('clara-ai-service');
      expect(mockGet).toHaveBeenCalledWith('/health');
    });

    it('lanza error cuando AI Service no está disponible', async () => {
      mockGet.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.health()).rejects.toThrow('AI Service no disponible');
    });
  });

  describe('predict()', () => {
    it('retorna resultado de predicción correctamente', async () => {
      const mockResult = {
        filename:   'scan.nii',
        prediction: {
          label:         'CN' as const,
          confidence:    0.92,
          probabilities: { CN: 0.92, MCI: 0.05, AD: 0.03 },
        },
        gradcam:       'data:image/png;base64,abc',
        model_version: '1.0.0',
      };
      mockPost.mockResolvedValue({ data: mockResult });

      const result = await service.predict('/tmp/scan.nii', 'scan.nii');

      expect(result.prediction.label).toBe('CN');
      expect(result.prediction.confidence).toBe(0.92);
      expect(mockPost).toHaveBeenCalledWith(
        '/predict/',
        expect.anything(),
        expect.objectContaining({ headers: expect.anything() })
      );
    });

    it('lanza error cuando AI Service falla en predicción', async () => {
      mockPost.mockRejectedValue(new Error('timeout'));

      await expect(
        service.predict('/tmp/test.nii', 'test.nii')
      ).rejects.toThrow('Error procesando imagen en AI Service');
    });
  });
});
import { HistoryService } from '../../services/history.service';
import { EnrichedAnalysisResult } from '../../models/analysis.model';

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockResult = (id: string, label: 'CN' | 'MCI' | 'AD' = 'CN', confidence = 0.92): EnrichedAnalysisResult => ({
  analysisId: id,
  filename: 'scan.nii',
  fileSize: 1024,
  prediction: { label, confidence, probabilities: { CN: 0.92, MCI: 0.05, AD: 0.03 } },
  gradcam: 'base64...',
  model_version: '1.0.0',
  analyzed_at: new Date().toISOString(),
  confidenceLevel: 'HIGH',
  confidenceLabel: 'Alta confianza',
  diagnosticLabel: 'Cognitivamente Normal',
  diagnosticColor: '#22c55e',
  requiresReview: false,
});

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(() => {
    service = new HistoryService();
  });

  describe('save()', () => {
    it('guarda una entrada correctamente', () => {
      const entry = service.save(mockResult('test-1'));
      expect(entry.analysisId).toBe('test-1');
      expect(service.count()).toBe(1);
    });

    it('guarda múltiples entradas', () => {
      service.save(mockResult('test-1'));
      service.save(mockResult('test-2'));
      service.save(mockResult('test-3'));
      expect(service.count()).toBe(3);
    });

    it('elimina entrada más antigua al llegar al límite de 100', () => {
      const largService = new HistoryService();
      for (let i = 0; i < 100; i++) {
        largService.save(mockResult(`entry-${i}`));
      }
      expect(largService.count()).toBe(100);

      largService.save(mockResult('entry-100'));
      expect(largService.count()).toBe(100);
      expect(largService.findById('entry-0')).toBeNull();
      expect(largService.findById('entry-100')).not.toBeNull();
    });
  });

  describe('findById()', () => {
    it('retorna la entrada correcta', () => {
      service.save(mockResult('test-1'));
      const found = service.findById('test-1');
      expect(found).not.toBeNull();
      expect(found?.analysisId).toBe('test-1');
    });

    it('retorna null si no existe', () => {
      expect(service.findById('no-existe')).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('retorna todas las entradas con paginación', () => {
      service.save(mockResult('test-1'));
      service.save(mockResult('test-2'));
      service.save(mockResult('test-3'));

      const page1 = service.findAll(2, 0);
      expect(page1).toHaveLength(2);

      const page2 = service.findAll(2, 2);
      expect(page2).toHaveLength(1);
    });

    it('retorna en orden descendente (más reciente primero)', () => {
      service.save(mockResult('test-1'));
      service.save(mockResult('test-2'));
      const all = service.findAll();
      expect(all[0].analysisId).toBe('test-2');
    });
  });

  describe('getStats()', () => {
    it('calcula estadísticas correctamente', () => {
      service.save(mockResult('test-1', 'CN', 0.92));
      service.save(mockResult('test-2', 'AD', 0.88));

      // Para requiresReview necesitamos pasar el flag explícitamente
      const lowConfidenceResult = mockResult('test-3', 'MCI', 0.4);
      lowConfidenceResult.requiresReview = true;
      lowConfidenceResult.confidenceLevel = 'LOW';
      service.save(lowConfidenceResult);

      const stats = service.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byLabel.CN).toBe(1);
      expect(stats.byLabel.AD).toBe(1);
      expect(stats.byLabel.MCI).toBe(1);
      expect(stats.requiresReview).toBe(1);
    });

    it('retorna lastAnalyzedAt null cuando no hay entradas', () => {
      const stats = service.getStats();
      expect(stats.lastAnalyzedAt).toBeNull();
      expect(stats.total).toBe(0);
    });
  });

  describe('deleteById()', () => {
    it('elimina una entrada existente', () => {
      service.save(mockResult('test-1'));
      expect(service.deleteById('test-1')).toBe(true);
      expect(service.count()).toBe(0);
    });

    it('retorna false si no existe', () => {
      expect(service.deleteById('no-existe')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('limpia todas las entradas', () => {
      service.save(mockResult('test-1'));
      service.save(mockResult('test-2'));
      service.clear();
      expect(service.count()).toBe(0);
    });
  });
});
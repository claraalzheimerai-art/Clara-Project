import {
  getConfidenceLevel,
  DIAGNOSTIC_LABELS,
  DIAGNOSTIC_COLORS,
  CONFIDENCE_THRESHOLDS,
  buildEnrichedResult,
  CONFIDENCE_LABELS,
  EnrichedAnalysisResult,
} from '../../models/analysis.model';

describe('analysis.model', () => {

  describe('getConfidenceLevel', () => {
    it('retorna HIGH cuando confianza >= 0.85', () => {
      expect(getConfidenceLevel(0.85)).toBe('HIGH');
      expect(getConfidenceLevel(0.99)).toBe('HIGH');
      expect(getConfidenceLevel(1.0)).toBe('HIGH');
    });

    it('retorna MEDIUM cuando confianza >= 0.65 y < 0.85', () => {
      expect(getConfidenceLevel(0.65)).toBe('MEDIUM');
      expect(getConfidenceLevel(0.75)).toBe('MEDIUM');
      expect(getConfidenceLevel(0.84)).toBe('MEDIUM');
    });

    it('retorna LOW cuando confianza < 0.65', () => {
      expect(getConfidenceLevel(0.0)).toBe('LOW');
      expect(getConfidenceLevel(0.5)).toBe('LOW');
      expect(getConfidenceLevel(0.64)).toBe('LOW');
    });
  });

  describe('DIAGNOSTIC_LABELS', () => {
    it('tiene etiquetas para las 3 clases', () => {
      expect(DIAGNOSTIC_LABELS.CN).toBe('Cognitivamente Normal');
      expect(DIAGNOSTIC_LABELS.MCI).toBe('Deterioro Cognitivo Leve');
      expect(DIAGNOSTIC_LABELS.AD).toBe('Enfermedad de Alzheimer');
    });
  });

  describe('DIAGNOSTIC_COLORS', () => {
    it('tiene colores para las 3 clases', () => {
      expect(DIAGNOSTIC_COLORS.CN).toBe('#22c55e');
      expect(DIAGNOSTIC_COLORS.MCI).toBe('#f59e0b');
      expect(DIAGNOSTIC_COLORS.AD).toBe('#ef4444');
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('HIGH > MEDIUM > LOW', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeGreaterThan(CONFIDENCE_THRESHOLDS.LOW);
    });
  });

  describe('buildEnrichedResult()', () => {
    const mockResult = {
      filename: 'scan.nii',
      prediction: {
        label: 'AD' as const,
        confidence: 0.92,
        probabilities: { CN: 0.03, MCI: 0.05, AD: 0.92 },
      },
      gradcam: 'data:image/png;base64,abc',
      model_version: '1.0.0',
      analyzed_at: '2026-04-01T00:00:00.000Z',
    };

    it('construye resultado enriquecido correctamente', () => {
      const enriched = buildEnrichedResult({
        analysisId: 'test-123',
        fileSize: 1024,
        result: mockResult,
      });

      expect(enriched.analysisId).toBe('test-123');
      expect(enriched.fileSize).toBe(1024);
      expect(enriched.diagnosticLabel).toBe('Enfermedad de Alzheimer');
      expect(enriched.diagnosticColor).toBe('#ef4444');
      expect(enriched.confidenceLevel).toBe('HIGH');
      expect(enriched.requiresReview).toBe(false);
    });

    it('marca requiresReview true cuando confianza es LOW', () => {
      const enriched = buildEnrichedResult({
        analysisId: 'test-456',
        fileSize: 512,
        result: { ...mockResult, prediction: { ...mockResult.prediction, confidence: 0.4 } },
      });

      expect(enriched.requiresReview).toBe(true);
      expect(enriched.confidenceLevel).toBe('LOW');
    });

    it('asigna etiquetas correctas para CN', () => {
      const enriched = buildEnrichedResult({
        analysisId: 'test-789',
        fileSize: 256,
        result: { ...mockResult, prediction: { ...mockResult.prediction, label: 'CN' as const } },
      });

      expect(enriched.diagnosticLabel).toBe('Cognitivamente Normal');
      expect(enriched.diagnosticColor).toBe('#22c55e');
    });
  });

  describe('CONFIDENCE_LABELS', () => {
    it('tiene etiquetas para los 3 niveles', () => {
      expect(CONFIDENCE_LABELS.HIGH).toBe('Alta confianza');
      expect(CONFIDENCE_LABELS.MEDIUM).toBe('Confianza media');
      expect(CONFIDENCE_LABELS.LOW).toContain('revisión médica');
    });
  });
});
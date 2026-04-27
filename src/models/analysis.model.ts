/**
 * Modelos de datos para el análisis de imágenes MRI.
 * Representan la estructura de los datos que fluyen
 * entre frontend → backend → AI service.
 */

export type DiagnosticLabel = 'CN' | 'MCI' | 'AD';

export interface ClassProbabilities {
  CN: number;
  MCI: number;
  AD: number;
}

export interface Prediction {
  label: DiagnosticLabel;
  confidence: number;
  probabilities: ClassProbabilities;
}

export interface AnalysisResult {
  filename:      string;
  prediction:    Prediction;
  gradcam:       string; // base64 PNG
  model_version: string;
  analyzed_at:   string; // ISO timestamp
}

export interface AnalysisRequest {
  filename:  string;
  file_size: number;
  mime_type: string;
}

export interface AnalysisError {
  code:    string;
  message: string;
  detail?: string;
}

// Etiquetas legibles para el médico
export const DIAGNOSTIC_LABELS: Record<DiagnosticLabel, string> = {
  CN:  'Cognitivamente Normal',
  MCI: 'Deterioro Cognitivo Leve',
  AD:  'Enfermedad de Alzheimer',
};

// Colores para visualización en frontend
export const DIAGNOSTIC_COLORS: Record<DiagnosticLabel, string> = {
  CN:  '#22c55e', // verde
  MCI: '#f59e0b', // amarillo
  AD:  '#ef4444', // rojo
};

// Umbrales de confianza
export const CONFIDENCE_THRESHOLDS = {
  HIGH:   0.85,
  MEDIUM: 0.65,
  LOW:    0.0,
} as const;

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH)   return 'HIGH';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

// Etiquetas de nivel de confianza
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  HIGH:   'Alta confianza',
  MEDIUM: 'Confianza media',
  LOW:    'Baja confianza — requiere revisión médica',
};

export interface EnrichedAnalysisResult extends AnalysisResult {
  analysisId:      string;
  fileSize:        number;
  confidenceLevel: ConfidenceLevel;
  confidenceLabel: string;
  diagnosticLabel: string;
  diagnosticColor: string;
  requiresReview:  boolean;
}

export function buildEnrichedResult(params: {
  analysisId: string;
  fileSize:   number;
  result:     AnalysisResult;
}): EnrichedAnalysisResult {
  const level = getConfidenceLevel(params.result.prediction.confidence);
  return {
    ...params.result,
    analysisId:      params.analysisId,
    fileSize:        params.fileSize,
    confidenceLevel: level,
    confidenceLabel: CONFIDENCE_LABELS[level],
    diagnosticLabel: DIAGNOSTIC_LABELS[params.result.prediction.label],
    diagnosticColor: DIAGNOSTIC_COLORS[params.result.prediction.label],
    requiresReview:  level === 'LOW',
  };
}
export type AlzheimerClass = 'CN' | 'MCI' | 'AD';
// CN  = Cognitivamente Normal
// MCI = Deterioro Cognitivo Leve
// AD  = Alzheimer's Disease

export const ALZHEIMER_LABELS: Record<AlzheimerClass, string> = {
  CN:  'Cognitivamente Normal',
  MCI: 'Deterioro Cognitivo Leve',
  AD:  'Enfermedad de Alzheimer',
};

export const ALZHEIMER_COLORS: Record<AlzheimerClass, string> = {
  CN:  '#22c55e',
  MCI: '#f59e0b',
  AD:  '#ef4444',
};

export interface ClassificationResult {
  label: AlzheimerClass;
  confidence: number;
  probabilities: {
    CN: number;
    MCI: number;
    AD: number;
  };
}

export interface GradCAMResult {
  heatmapBase64: string;
  highlightedRegions: string[];
}

export interface AIServiceResponse {
  classification: ClassificationResult;
  gradcam: GradCAMResult;
  modelVersion: string;
  processingTimeMs: number;
}

export interface AnalysisResponse {
  analysisId: string;
  filename: string;
  classification: ClassificationResult;
  gradcam: GradCAMResult;
  modelVersion: string;
  processingTimeMs: number;
  timestamp: string;
}

export interface AnalysisRequestMeta {
  filename:  string;
  fileSize:  number;
  mimeType:  string;
  uploadedAt: string;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.65) return 'MEDIUM';
  return 'LOW';
}

export function getConfidenceLevelLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    HIGH:   'Alta confianza',
    MEDIUM: 'Confianza media',
    LOW:    'Baja confianza — requiere revisión médica',
  };
  return labels[level];
}
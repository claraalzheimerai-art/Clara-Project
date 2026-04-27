import { EnrichedAnalysisResult } from '../models/analysis.model';
import { logger } from '../utils/logger';

export interface HistoryEntry {
  analysisId:      string;
  filename:        string;
  fileSize:        number;
  diagnosticLabel: string;
  diagnosticColor: string;
  confidenceLevel: string;
  confidence:      number;
  label:           string;
  requiresReview:  boolean;
  modelVersion:    string;
  analyzedAt:      string;
}

export interface HistoryStats {
  total:        number;
  byLabel:      Record<string, number>;
  byConfidence: Record<string, number>;
  requiresReview: number;
  lastAnalyzedAt: string | null;
}

class HistoryService {
  private entries: Map<string, HistoryEntry> = new Map();
  private readonly MAX_ENTRIES = 100;

  save(result: EnrichedAnalysisResult): HistoryEntry {
    const entry: HistoryEntry = {
      analysisId:      result.analysisId,
      filename:        result.filename,
      fileSize:        result.fileSize,
      diagnosticLabel: result.diagnosticLabel,
      diagnosticColor: result.diagnosticColor,
      confidenceLevel: result.confidenceLevel,
      confidence:      result.prediction.confidence,
      label:           result.prediction.label,
      requiresReview:  result.requiresReview,
      modelVersion:    result.model_version,
      analyzedAt:      result.analyzed_at,
    };

    if (this.entries.size >= this.MAX_ENTRIES) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey) {
        this.entries.delete(oldestKey);
        logger.debug(`Historial: entrada más antigua eliminada (límite ${this.MAX_ENTRIES})`);
      }
    }

    this.entries.set(entry.analysisId, entry);
    logger.info(`Historial: guardado análisis ${entry.analysisId} → ${entry.label}`);
    return entry;
  }

  findById(analysisId: string): HistoryEntry | null {
    return this.entries.get(analysisId) ?? null;
  }

  findAll(limit = 20, offset = 0): HistoryEntry[] {
    const all = Array.from(this.entries.values()).reverse();
    return all.slice(offset, offset + limit);
  }

  getStats(): HistoryStats {
    const all = Array.from(this.entries.values());

    const byLabel: Record<string, number>      = { CN: 0, MCI: 0, AD: 0 };
    const byConfidence: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    let requiresReview  = 0;
    let lastAnalyzedAt: string | null = null;

    for (const entry of all) {
      byLabel[entry.label]               = (byLabel[entry.label] ?? 0) + 1;
      byConfidence[entry.confidenceLevel] = (byConfidence[entry.confidenceLevel] ?? 0) + 1;
      if (entry.requiresReview) requiresReview++;
      if (!lastAnalyzedAt || entry.analyzedAt > lastAnalyzedAt) {
        lastAnalyzedAt = entry.analyzedAt;
      }
    }

    return { total: all.length, byLabel, byConfidence, requiresReview, lastAnalyzedAt };
  }

  deleteById(analysisId: string): boolean {
    const deleted = this.entries.delete(analysisId);
    if (deleted) logger.info(`Historial: eliminado análisis ${analysisId}`);
    return deleted;
  }

  clear(): void {
    this.entries.clear();
    logger.info('Historial: limpiado completamente');
  }

  count(): number {
    return this.entries.size;
  }
}

export const historyService = new HistoryService();
export { HistoryService };
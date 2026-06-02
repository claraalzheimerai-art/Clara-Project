import sql from 'mssql';
import { getPool } from '../config/database.config';
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

export interface HistoryDetailEntry extends HistoryEntry {
  gradcam:   string | null;
  mri_image: string | null;
}

export interface HistoryStats {
  total:          number;
  byLabel:        Record<string, number>;
  byConfidence:   Record<string, number>;
  requiresReview: number;
  lastAnalyzedAt: string | null;
}

class HistoryService {

  async save(result: EnrichedAnalysisResult, userId: number | null = null): Promise<HistoryEntry> {
    const pool = getPool();

    await pool.request()
      .input('id',                   sql.NVarChar(36),     result.analysisId)
      .input('userId',               sql.Int,               userId)
      .input('filename',             sql.NVarChar(255),     result.filename)
      .input('fileSize',             sql.Int,               result.fileSize)
      .input('predictionLabel',      sql.NVarChar(3),       result.prediction.label)
      .input('predictionConfidence', sql.Decimal(5, 4),     result.prediction.confidence)
      .input('probabilityCn',        sql.Decimal(5, 4),     result.prediction.probabilities.CN)
      .input('probabilityMci',       sql.Decimal(5, 4),     result.prediction.probabilities.MCI)
      .input('probabilityAd',        sql.Decimal(5, 4),     result.prediction.probabilities.AD)
      .input('gradcam',              sql.NVarChar(sql.MAX), result.gradcam   ?? null)
      .input('mriImage',             sql.NVarChar(sql.MAX), result.mri_image ?? null)
      .input('modelVersion',         sql.NVarChar(50),      result.model_version)
      .input('confidenceLevel',      sql.NVarChar(6),       result.confidenceLevel)
      .input('diagnosticLabel',      sql.NVarChar(100),     result.diagnosticLabel)
      .input('diagnosticColor',      sql.NVarChar(10),      result.diagnosticColor)
      .input('requiresReview',       sql.Bit,               result.requiresReview ? 1 : 0)
      .input('analyzedAt',           sql.DateTime,          new Date(result.analyzed_at))
      .query(`
        INSERT INTO analysis_history (
          id, user_id, filename, file_size,
          prediction_label, prediction_confidence,
          probability_cn, probability_mci, probability_ad,
          gradcam, mri_image,
          model_version, confidence_level, diagnostic_label,
          diagnostic_color, requires_review, analyzed_at
        ) VALUES (
          @id, @userId, @filename, @fileSize,
          @predictionLabel, @predictionConfidence,
          @probabilityCn, @probabilityMci, @probabilityAd,
          @gradcam, @mriImage,
          @modelVersion, @confidenceLevel, @diagnosticLabel,
          @diagnosticColor, @requiresReview, @analyzedAt
        )
      `);

    logger.info(`Historial: guardado análisis ${result.analysisId} → ${result.prediction.label}`);
    return this._toEntry(result);
  }

  async findById(analysisId: string): Promise<HistoryDetailEntry | null> {
    const pool = getPool();
    const res  = await pool.request()
      .input('id', sql.NVarChar(36), analysisId)
      .query('SELECT TOP 1 * FROM analysis_history WHERE id = @id');

    if (!res.recordset.length) return null;
    const row = res.recordset[0];
    return {
      ...this._rowToEntry(row),
      gradcam:   row.gradcam   ?? null,
      mri_image: row.mri_image ?? null,
    };
  }

  async findAll(limit = 20, offset = 0): Promise<HistoryEntry[]> {
    const pool = getPool();
    const res  = await pool.request()
      .input('limit',  sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT id, user_id, filename, file_size, prediction_label, prediction_confidence,
               confidence_level, diagnostic_label, diagnostic_color, requires_review,
               model_version, analyzed_at
        FROM   analysis_history
        ORDER  BY analyzed_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return res.recordset.map(row => this._rowToEntry(row));
  }

  async getStats(): Promise<HistoryStats> {
    const pool = getPool();

    const [totals, labels, confidences, reviews, lastRow] = await Promise.all([
      pool.request().query('SELECT COUNT(*) AS total FROM analysis_history'),
      pool.request().query(`
        SELECT prediction_label AS lbl, COUNT(*) AS cnt
        FROM   analysis_history
        GROUP  BY prediction_label
      `),
      pool.request().query(`
        SELECT confidence_level AS lvl, COUNT(*) AS cnt
        FROM   analysis_history
        GROUP  BY confidence_level
      `),
      pool.request().query('SELECT COUNT(*) AS cnt FROM analysis_history WHERE requires_review = 1'),
      pool.request().query('SELECT TOP 1 analyzed_at FROM analysis_history ORDER BY analyzed_at DESC'),
    ]);

    const byLabel:      Record<string, number> = { CN: 0, MCI: 0, AD: 0 };
    const byConfidence: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const r of labels.recordset)      byLabel[r.lbl]      = r.cnt;
    for (const r of confidences.recordset) byConfidence[r.lvl] = r.cnt;

    const raw = lastRow.recordset[0]?.analyzed_at;
    const lastAnalyzedAt = raw instanceof Date ? raw.toISOString() : (raw ?? null);

    return {
      total:          totals.recordset[0].total,
      byLabel,
      byConfidence,
      requiresReview: reviews.recordset[0].cnt,
      lastAnalyzedAt,
    };
  }

  async deleteById(analysisId: string): Promise<boolean> {
    const pool    = getPool();
    const res     = await pool.request()
      .input('id', sql.NVarChar(36), analysisId)
      .query('DELETE FROM analysis_history WHERE id = @id');

    const deleted = (res.rowsAffected[0] ?? 0) > 0;
    if (deleted) logger.info(`Historial: eliminado análisis ${analysisId}`);
    return deleted;
  }

  async clear(): Promise<void> {
    const pool = getPool();
    await pool.request().query('DELETE FROM analysis_history');
    logger.info('Historial: limpiado completamente');
  }

  async count(): Promise<number> {
    const pool = getPool();
    const res  = await pool.request().query('SELECT COUNT(*) AS total FROM analysis_history');
    return res.recordset[0].total;
  }

  private _toEntry(r: EnrichedAnalysisResult): HistoryEntry {
    return {
      analysisId:      r.analysisId,
      filename:        r.filename,
      fileSize:        r.fileSize,
      diagnosticLabel: r.diagnosticLabel,
      diagnosticColor: r.diagnosticColor,
      confidenceLevel: r.confidenceLevel,
      confidence:      r.prediction.confidence,
      label:           r.prediction.label,
      requiresReview:  r.requiresReview,
      modelVersion:    r.model_version,
      analyzedAt:      r.analyzed_at,
    };
  }

  private _rowToEntry(row: any): HistoryEntry {
    const raw = row.analyzed_at;
    return {
      analysisId:      row.id,
      filename:        row.filename,
      fileSize:        row.file_size,
      diagnosticLabel: row.diagnostic_label,
      diagnosticColor: row.diagnostic_color,
      confidenceLevel: row.confidence_level,
      confidence:      parseFloat(row.prediction_confidence),
      label:           row.prediction_label,
      requiresReview:  row.requires_review === true || row.requires_review === 1,
      modelVersion:    row.model_version,
      analyzedAt:      raw instanceof Date ? raw.toISOString() : raw,
    };
  }
}

export const historyService = new HistoryService();
export { HistoryService };

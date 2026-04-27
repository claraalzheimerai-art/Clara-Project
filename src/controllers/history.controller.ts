import { Request, Response } from 'express';
import { historyService } from '../services/history.service';
import { successResponse, errorResponse } from '../models/api.model';
import { logger } from '../utils/logger';

export const getHistory = (req: Request, res: Response): void => {
  const limit  = Math.min(parseInt(req.query.limit  as string) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0,  0);

  const entries = historyService.findAll(limit, offset);
  const total   = historyService.count();

  res.json(successResponse({
    entries,
    pagination: { limit, offset, total, hasMore: offset + limit < total },
  }));
};

export const getHistoryById = (req: Request, res: Response): void => {
  const { id } = req.params;
  const entry  = historyService.findById(Array.isArray(id) ? id[0] : id);

  if (!entry) {
    res.status(404).json(errorResponse(`Análisis ${id} no encontrado`));
    return;
  }

  res.json(successResponse(entry));
};

export const getHistoryStats = (_req: Request, res: Response): void => {
  const stats = historyService.getStats();
  res.json(successResponse(stats));
};

export const deleteHistoryEntry = (req: Request, res: Response): void => {
  const { id }    = req.params;
  const deleted   = historyService.deleteById(Array.isArray(id) ? id[0] : id);

  if (!deleted) {
    res.status(404).json(errorResponse(`Análisis ${id} no encontrado`));
    return;
  }

  res.json(successResponse({ deleted: true, analysisId: id }));
};

export const clearHistory = (_req: Request, res: Response): void => {
  historyService.clear();
  logger.info('Historial limpiado via API');
  res.json(successResponse({ cleared: true }));
};
import { Request, Response } from 'express';
import { historyService } from '../services/history.service';
import { successResponse, errorResponse } from '../models/api.model';
import { logger } from '../utils/logger';

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0,  0);

    const [entries, total] = await Promise.all([
      historyService.findAll(limit, offset),
      historyService.count(),
    ]);

    res.json(successResponse({
      entries,
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    }));
  } catch (error) {
    logger.error('Error obteniendo historial:', error);
    res.status(500).json(errorResponse('Error al obtener historial'));
  }
};

export const getHistoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const entry  = await historyService.findById(Array.isArray(id) ? id[0] : id);

    if (!entry) {
      res.status(404).json(errorResponse(`Análisis ${id} no encontrado`));
      return;
    }

    res.json(successResponse(entry));
  } catch (error) {
    logger.error('Error obteniendo análisis:', error);
    res.status(500).json(errorResponse('Error al obtener análisis'));
  }
};

export const getHistoryStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await historyService.getStats();
    res.json(successResponse(stats));
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json(errorResponse('Error al obtener estadísticas'));
  }
};

export const deleteHistoryEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id }  = req.params;
    const deleted = await historyService.deleteById(Array.isArray(id) ? id[0] : id);

    if (!deleted) {
      res.status(404).json(errorResponse(`Análisis ${id} no encontrado`));
      return;
    }

    res.json(successResponse({ deleted: true, analysisId: id }));
  } catch (error) {
    logger.error('Error eliminando análisis:', error);
    res.status(500).json(errorResponse('Error al eliminar análisis'));
  }
};

export const clearHistory = async (_req: Request, res: Response): Promise<void> => {
  try {
    await historyService.clear();
    logger.info('Historial limpiado via API');
    res.json(successResponse({ cleared: true }));
  } catch (error) {
    logger.error('Error limpiando historial:', error);
    res.status(500).json(errorResponse('Error al limpiar historial'));
  }
};

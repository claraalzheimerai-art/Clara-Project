import { Router } from 'express';
import {
  getHistory,
  getHistoryById,
  getHistoryStats,
  deleteHistoryEntry,
  clearHistory,
} from '../controllers/history.controller';

const router = Router();

/**
 * @openapi
 * /history:
 *   get:
 *     summary: Obtener historial de análisis
 *     tags: [Historial]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista de análisis realizados
 */
router.get('/', getHistory);

/**
 * @openapi
 * /history/stats:
 *   get:
 *     summary: Estadísticas del historial
 *     tags: [Historial]
 *     responses:
 *       200:
 *         description: Estadísticas agregadas CN/MCI/AD
 */
router.get('/stats', getHistoryStats);

/**
 * @openapi
 * /history/{id}:
 *   get:
 *     summary: Obtener análisis por ID
 *     tags: [Historial]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Análisis encontrado
 *       404:
 *         description: Análisis no encontrado
 */
router.get('/:id', getHistoryById);

/**
 * @openapi
 * /history/{id}:
 *   delete:
 *     summary: Eliminar análisis del historial
 *     tags: [Historial]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Análisis eliminado
 *       404:
 *         description: Análisis no encontrado
 */
router.delete('/:id', deleteHistoryEntry);

/**
 * @openapi
 * /history:
 *   delete:
 *     summary: Limpiar todo el historial
 *     tags: [Historial]
 *     responses:
 *       200:
 *         description: Historial limpiado
 */
router.delete('/', clearHistory);

export default router;
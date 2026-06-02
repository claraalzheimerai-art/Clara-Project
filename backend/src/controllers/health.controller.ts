import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';

export const healthCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const aiHealth = await aiService.health();
    res.json({
      status:     'ok',
      backend:    'clara-backend',
      ai_service: aiHealth,
    });
  } catch (error) {
    res.status(503).json({
      status:     'degraded',
      backend:    'clara-backend',
      ai_service: 'no disponible',
    });
  }
};
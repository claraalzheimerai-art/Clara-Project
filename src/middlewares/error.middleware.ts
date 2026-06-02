import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ENV } from '../config/env.config';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(`Error: ${error.message}`, { stack: error.stack });

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: error.message || 'Error interno del servidor',
    ...(ENV.IS_DEVELOPMENT && { stack: error.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};
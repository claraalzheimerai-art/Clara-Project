import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Headers de seguridad HTTP
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // desactivado para permitir Swagger UI
  crossOriginEmbedderPolicy: false,
});

// Rate limit general — todas las rutas
export const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutos
  max:              100,             // 100 peticiones por ventana
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error:   'Demasiadas peticiones',
    message: 'Has excedido el límite de peticiones. Intenta de nuevo en 15 minutos.',
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit excedido — IP: ${req.ip} | ruta: ${req.path}`);
    res.status(429).json({
      error:   'Demasiadas peticiones',
      message: 'Has excedido el límite de peticiones. Intenta de nuevo en 15 minutos.',
    });
  },
});

// Rate limit estricto — endpoint de análisis MRI
export const analysisLimiter = rateLimit({
  windowMs:        60 * 1000, // 1 minuto
  max:             10,        // 10 análisis por minuto
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Analysis rate limit excedido — IP: ${req.ip}`);
    res.status(429).json({
      error:   'Límite de análisis excedido',
      message: 'Máximo 10 análisis por minuto. Intenta de nuevo en un momento.',
    });
  },
});
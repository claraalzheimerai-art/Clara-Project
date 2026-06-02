import cors from 'cors';
import { ENV } from '../config/env.config';
import { logger } from '../utils/logger';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin && ENV.IS_DEVELOPMENT) {
      return callback(null, true);
    }
    if (!origin || ENV.CORS.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Origen CORS bloqueado: ${origin}`);
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
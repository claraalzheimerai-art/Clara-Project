import 'express-async-errors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';
import { corsMiddleware } from './middlewares/cors.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { securityHeaders, generalLimiter } from './middlewares/security.middleware';
import routes from './routes/index';
import authRouter from './routes/auth.routes';
import { ENV } from './config/env.config';
import { logger } from './utils/logger';

const app = express();

// ── 1. Seguridad global — debe ir PRIMERO ────────────────────
app.use(securityHeaders);
app.use(generalLimiter);
app.use(corsMiddleware);

// ── 2. Body parsers — ANTES de cualquier ruta ────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 3. Rutas ─────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use(`/api/${ENV.API_VERSION}`, routes);

// ── 4. Swagger ───────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'CLARA API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1e40af; }',
}));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ── 5. Root info ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name:        'CLARA Backend API',
    version:     ENV.API_VERSION,
    description: 'Clinical Learning Assistant for Radiology Analysis – USC 2026',
    docs:        '/api-docs',
  });
});

// ── 6. Error handlers — siempre AL FINAL ────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

logger.info(`App configurada — Entorno: ${ENV.NODE_ENV}`);

export default app;
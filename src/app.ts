import 'express-async-errors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';
import { corsMiddleware } from './middlewares/cors.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { securityHeaders, generalLimiter } from './middlewares/security.middleware';
import routes from './routes/index';
import { ENV } from './config/env.config';
import { logger } from './utils/logger';

const app = express();

app.use(securityHeaders);
app.use(generalLimiter);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(`/api/${ENV.API_VERSION}`, routes);

app.get('/', (_req, res) => {
  res.json({
    name: 'CLARA Backend API',
    version: ENV.API_VERSION,
    description: 'Clinical Learning Assistant for Radiology Analysis – USC 2026',
    docs: `/api/${ENV.API_VERSION}/analysis/health`,
  });
});

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'CLARA API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1e40af; }',
}));

// Exponer spec en JSON
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use(notFoundHandler);
app.use(errorHandler);

logger.info(`App configurada — Entorno: ${ENV.NODE_ENV}`);

export default app;
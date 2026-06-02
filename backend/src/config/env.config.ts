import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3000'),
  ENV:  process.env.NODE_ENV || 'development',

  AI_SERVICE_URL:        process.env.AI_SERVICE_URL        || 'http://localhost:8000',
  AI_SERVICE_TIMEOUT_MS: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '60000'),

  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '50'),
  UPLOAD_TEMP_DIR:    process.env.UPLOAD_TEMP_DIR || 'uploads/temp',

  CORS_ORIGIN: process.env.ALLOWED_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500',

  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  LOG_DIR:   process.env.LOG_DIR   || 'logs',

  API_VERSION: process.env.API_VERSION || 'v1',
};

export const ENV = {
  PORT:           config.PORT,
  NODE_ENV:       config.ENV,
  API_VERSION:    config.API_VERSION,
  IS_DEVELOPMENT: config.ENV === 'development',

  AI_SERVICE: {
    URL:        config.AI_SERVICE_URL,
    TIMEOUT_MS: config.AI_SERVICE_TIMEOUT_MS,
  },

  UPLOAD: {
    MAX_SIZE_MB:    config.UPLOAD_MAX_SIZE_MB,
    MAX_SIZE_BYTES: config.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    TEMP_DIR:       config.UPLOAD_TEMP_DIR,
  },

  CORS: {
    ORIGIN:          config.CORS_ORIGIN,
    ALLOWED_ORIGINS: config.CORS_ORIGIN.split(',').map(o => o.trim()),
  },

  LOG: {
    LEVEL: config.LOG_LEVEL,
    DIR:   config.LOG_DIR,
  },
};
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env.config';

if (!fs.existsSync(ENV.LOG.DIR)) {
  fs.mkdirSync(ENV.LOG.DIR, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: ENV.LOG.LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(ENV.LOG.DIR, 'clara.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(ENV.LOG.DIR, 'error.log'),
      level: 'error',
    }),
  ],
});
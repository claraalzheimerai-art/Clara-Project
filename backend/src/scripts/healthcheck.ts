/**
 * Script de health check automático entre servicios.
 * Verifica que clara-ai-service esté disponible y loguea el estado.
 *
 * Uso:
 *   npx ts-node src/scripts/healthcheck.ts
 *   npx ts-node src/scripts/healthcheck.ts --watch --interval 30
 */
import axios from 'axios';
import { ENV } from '../config/env.config';
import { logger } from '../utils/logger';

interface HealthStatus {
  service:     string;
  url:         string;
  status:      'ok' | 'degraded' | 'down';
  latency_ms:  number;
  detail?:     Record<string, unknown>;
  checked_at:  string;
}

async function checkAIService(): Promise<HealthStatus> {
  const url       = `${ENV.AI_SERVICE.URL}/health`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 5000,
    });

    const latency = Date.now() - startTime;

    return {
      service:    'clara-ai-service',
      url,
      status:     'ok',
      latency_ms: latency,
      detail:     response.data,
      checked_at: new Date().toISOString(),
    };

  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    return {
      service:    'clara-ai-service',
      url,
      status:     'down',
      latency_ms: latency,
      detail:     { error: message },
      checked_at: new Date().toISOString(),
    };
  }
}

function logStatus(status: HealthStatus): void {
  const icon = status.status === 'ok' ? '✅' : '❌';
  const msg  = `${icon} ${status.service} — ${status.status.toUpperCase()} (${status.latency_ms}ms)`;

  if (status.status === 'ok') {
    logger.info(msg);
    if (status.detail) {
      logger.info(`   version: ${(status.detail as any).version} | device: ${(status.detail as any).device}`);
    }
  } else {
    logger.error(msg);
    logger.error(`   url: ${status.url}`);
    logger.error(`   error: ${(status.detail as any)?.error}`);
  }
}

async function runOnce(): Promise<void> {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('CLARA — Health Check');
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const aiStatus = await checkAIService();
  logStatus(aiStatus);

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Exit code 1 si algún servicio está caído
  if (aiStatus.status === 'down') {
    process.exit(1);
  }
}

async function runWatch(intervalSeconds: number): Promise<void> {
  logger.info(`Health check en modo watch — intervalo: ${intervalSeconds}s`);
  logger.info('Presiona Ctrl+C para detener\n');

  const run = async () => {
    const aiStatus = await checkAIService();
    logStatus(aiStatus);
  };

  await run();
  setInterval(run, intervalSeconds * 1000);
}

// Parsear argumentos
const args    = process.argv.slice(2);
const isWatch = args.includes('--watch');
const intIdx  = args.indexOf('--interval');
const interval = intIdx !== -1 ? parseInt(args[intIdx + 1]) || 30 : 30;

if (isWatch) {
  runWatch(interval);
} else {
  runOnce();
}
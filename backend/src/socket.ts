import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { ENV } from './config/env.config';
import { logger } from './utils/logger';

// Eventos que emite el servidor al frontend
export const SOCKET_EVENTS = {
  // Servidor → Cliente
  ANALYSIS_STARTED:   'analysis:started',
  ANALYSIS_PROGRESS:  'analysis:progress',
  ANALYSIS_COMPLETE:  'analysis:complete',
  ANALYSIS_ERROR:     'analysis:error',
  SERVICE_STATUS:     'service:status',

  // Cliente → Servidor
  SUBSCRIBE:          'analysis:subscribe',
  UNSUBSCRIBE:        'analysis:unsubscribe',
  PING:               'ping',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

// Payload de eventos
export interface AnalysisStartedPayload {
  analysisId: string;
  filename:   string;
  startedAt:  string;
}

export interface AnalysisProgressPayload {
  analysisId: string;
  stage:      'uploading' | 'preprocessing' | 'inference' | 'gradcam' | 'done';
  message:    string;
  percent:    number;
}

export interface AnalysisCompletePayload {
  analysisId:    string;
  filename:      string;
  prediction: {
    label:         string;
    confidence:    number;
    probabilities: Record<string, number>;
  };
  gradcam:       string;
  model_version: string;
  analyzed_at:   string;
}

export interface AnalysisErrorPayload {
  analysisId: string;
  error:      string;
  code:       string;
}

// Helper para emitir a una sala específica
export function emitToAnalysis(
  io: SocketServer,
  analysisId: string,
  event: string,
  payload: unknown
): void {
  io.to(`analysis:${analysisId}`).emit(event, payload);
  logger.debug(`Socket emit → analysis:${analysisId} | event: ${event}`);
}

// Helper para emitir a todos los clientes conectados
export function emitToAll(
  io: SocketServer,
  event: string,
  payload: unknown
): void {
  io.emit(event, payload);
}

function registerHandlers(socket: Socket): void {
  // Cliente se suscribe a un análisis específico
  socket.on(SOCKET_EVENTS.SUBSCRIBE, (analysisId: string) => {
    if (!analysisId || typeof analysisId !== 'string') {
      logger.warn(`Socket ${socket.id}: analysisId inválido`);
      return;
    }
    socket.join(`analysis:${analysisId}`);
    logger.info(`Socket ${socket.id} suscrito a analysis:${analysisId}`);
  });

  // Cliente se desuscribe
  socket.on(SOCKET_EVENTS.UNSUBSCRIBE, (analysisId: string) => {
    socket.leave(`analysis:${analysisId}`);
    logger.info(`Socket ${socket.id} desuscrito de analysis:${analysisId}`);
  });

  // Ping para mantener conexión activa
  socket.on(SOCKET_EVENTS.PING, () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Desconexión
  socket.on('disconnect', (reason) => {
    logger.info(`Socket desconectado: ${socket.id} — razón: ${reason}`);
  });

  // Error en socket
  socket.on('error', (error) => {
    logger.error(`Socket error ${socket.id}:`, error);
  });
}

export const initSocketIO = (httpServer: HTTPServer): SocketServer => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin:      ENV.CORS.ALLOWED_ORIGINS,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.info(`Socket conectado: ${socket.id} | IP: ${socket.handshake.address}`);

    // Enviar estado inicial del servicio
    socket.emit(SOCKET_EVENTS.SERVICE_STATUS, {
      status:     'ok',
      service:    'clara-backend',
      connectedAt: new Date().toISOString(),
    });

    registerHandlers(socket);
  });

  logger.info('Socket.IO inicializado');
  return io;
};
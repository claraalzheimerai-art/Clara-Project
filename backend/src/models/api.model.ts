/**
 * Modelos genéricos de respuesta de la API REST de CLARA.
 * Estandarizan la estructura de todas las respuestas HTTP.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
  meta?:   ResponseMeta;
}

export interface ResponseMeta {
  timestamp:     string;
  version:       string;
  response_time: number; // ms
}

export interface HealthResponse {
  status:     'ok' | 'degraded' | 'down';
  backend:    string;
  ai_service: {
    status:  string;
    version: string;
    device:  string;
    env:     string;
  };
}

// Helper para construir respuestas estandarizadas
export function successResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp:     new Date().toISOString(),
      version:       '1.0.0',
      response_time: 0,
      ...meta,
    },
  };
}

export function errorResponse(
  message: string,
  detail?: string
): ApiResponse<never> {
  return {
    success: false,
    error:   message,
    meta: {
      timestamp:     new Date().toISOString(),
      version:       '1.0.0',
      response_time: 0,
    },
  };
}
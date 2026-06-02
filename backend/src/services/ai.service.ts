import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../utils/logger';
import { ENV } from '../config/env.config';

// ── Tipos que retorna el AI service (FastAPI) ────────────────────────────────

interface AIRawResponse {
  best_filename:   string;
  prediction: {
    label:         'CN' | 'MCI' | 'AD';
    confidence:    number;
    probabilities: { CN: number; MCI: number; AD: number };
  };
  gradcam:         string; // "data:image/png;base64,xxx"
  mri_image:       string; // "data:image/png;base64,xxx"
  all_predictions: { filename: string; prediction: AIRawResponse['prediction'] }[];
  model_version:   string;
}

// ── Tipo que consume el backend internamente ─────────────────────────────────

export interface PredictionResult {
  filename:      string;
  prediction: {
    label:         'CN' | 'MCI' | 'AD';
    confidence:    number;
    probabilities: { CN: number; MCI: number; AD: number };
  };
  gradcam:       string; // base64 puro, sin prefijo
  mri_image:     string; // base64 puro, sin prefijo
  model_version: string;
}

export interface HealthResult {
  status:  string;
  service: string;
  version: string;
  env:     string;
  device:  string;
}

// ── Cliente HTTP hacia el AI service ─────────────────────────────────────────

class AIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENV.AI_SERVICE.URL,
      timeout: ENV.AI_SERVICE.TIMEOUT_MS,
    });

    logger.info(`AI Service URL: ${this.client.defaults.baseURL}`);
  }

  async health(): Promise<HealthResult> {
    try {
      const response = await this.client.get<HealthResult>('/health');
      return response.data;
    } catch (error) {
      logger.error('AI Service health check failed:', error);
      throw new Error('AI Service no disponible');
    }
  }

  async predict(filePath: string, filename: string): Promise<PredictionResult> {
    try {
      const form = new FormData();

      // El AI service espera el campo "files" (plural) como lista de archivos
      form.append('files', fs.createReadStream(filePath), {
        filename,
        contentType: 'application/octet-stream',
      });

      logger.info(`Enviando imagen al AI Service: ${filename}`);

      const response = await this.client.post<AIRawResponse>(
        '/predict/',
        form,
        { headers: form.getHeaders() },
      );

      const data = response.data;

      // El AI service devuelve gradcam con prefijo "data:image/png;base64,"
      // pero el frontend lo agrega al mostrar, así que lo eliminamos aquí
      const stripPrefix = (s: string) => s.replace(/^data:image\/[a-z]+;base64,/, '');
      const gradcam   = stripPrefix(data.gradcam);
      const mri_image = stripPrefix(data.mri_image);

      logger.info(`Predicción recibida: ${data.prediction.label} (${(data.prediction.confidence * 100).toFixed(1)}%)`);

      return {
        filename:      data.best_filename,
        prediction:    data.prediction,
        gradcam,
        mri_image,
        model_version: data.model_version,
      };

    } catch (error: any) {
      if (error?.response) {
        // El AI service respondió con un código de error HTTP
        logger.error(`AI Service respondió ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        throw new Error(`AI Service error ${error.response.status}: ${error.response.data?.detail ?? JSON.stringify(error.response.data)}`);
      } else if (error?.code) {
        // Error de red (ECONNREFUSED, ETIMEDOUT, etc.)
        logger.error(`Error de red hacia AI Service [${error.code}]: ${error.message}`);
        throw new Error(`No se pudo conectar al AI Service (${error.code}). ¿Está corriendo en ${ENV.AI_SERVICE.URL}?`);
      }
      logger.error('Error desconocido en AI Service:', error);
      throw new Error('Error procesando imagen en AI Service');
    }
  }
}

export const aiService = new AIService();
export { AIService };

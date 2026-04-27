import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../utils/logger';
import { ENV } from '../config/env.config';

export interface PredictionResult {
  filename: string;
  prediction: {
    label: 'CN' | 'MCI' | 'AD';
    confidence: number;
    probabilities: {
      CN: number;
      MCI: number;
      AD: number;
    };
  };
  gradcam: string;
  model_version: string;
}

export interface HealthResult {
  status: string;
  service: string;
  version: string;
  env: string;
  device: string;
}

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
      form.append('file', fs.createReadStream(filePath), {
        filename,
        contentType: 'application/octet-stream',
      });

      logger.info(`Enviando imagen al AI Service: ${filename}`);

      const response = await this.client.post<PredictionResult>(
        '/predict/',
        form,
        { headers: form.getHeaders() }
      );

      logger.info(`Predicción recibida: ${response.data.prediction.label}`);
      return response.data;

    } catch (error) {
      logger.error('Error en predicción AI Service:', error);
      throw new Error('Error procesando imagen en AI Service');
    }
  }
}

export const aiService = new AIService();
export { AIService };
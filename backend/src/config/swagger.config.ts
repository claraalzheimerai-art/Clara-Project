import swaggerJsdoc from 'swagger-jsdoc';
import { ENV } from './env.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'CLARA Backend API',
      version:     '1.0.0',
      description: `
## Clinical Learning Assistant for Radiology Analysis

API REST para el sistema de diagnóstico temprano de Alzheimer mediante análisis de imágenes MRI con Deep Learning.

### Flujo de análisis
1. El médico sube una imagen MRI (NIfTI o DICOM) via \`POST /upload\`
2. El backend reenvía la imagen al **clara-ai-service** (Python/FastAPI)
3. ResNet50 clasifica la imagen en CN / MCI / AD
4. Grad-CAM genera el mapa de activación
5. El resultado se retorna via HTTP y Socket.IO

### Universidad Santiago de Cali · 2026
      `,
      contact: {
        name:  'Equipo CLARA',
        email: 'nahia.montoya00@usc.edu.co',
      },
    },
    servers: [
      {
        url:         `http://localhost:${ENV.PORT}/api/${ENV.API_VERSION}`,
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      schemas: {
        DiagnosticLabel: {
          type: 'string',
          enum: ['CN', 'MCI', 'AD'],
          description: 'CN = Cognitivamente Normal | MCI = Deterioro Cognitivo Leve | AD = Alzheimer',
        },
        ClassProbabilities: {
          type: 'object',
          properties: {
            CN:  { type: 'number', example: 0.1023 },
            MCI: { type: 'number', example: 0.7842 },
            AD:  { type: 'number', example: 0.1135 },
          },
        },
        Prediction: {
          type: 'object',
          properties: {
            label:         { $ref: '#/components/schemas/DiagnosticLabel' },
            confidence:    { type: 'number', example: 0.7842 },
            probabilities: { $ref: '#/components/schemas/ClassProbabilities' },
          },
        },
        AnalysisResult: {
          type: 'object',
          properties: {
            filename:      { type: 'string', example: 'scan_001.nii' },
            prediction:    { $ref: '#/components/schemas/Prediction' },
            gradcam:       { type: 'string', description: 'Imagen PNG en base64', example: 'data:image/png;base64,...' },
            model_version: { type: 'string', example: '1.0.0' },
            analyzed_at:   { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data:    { type: 'object' },
            error:   { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                timestamp:     { type: 'string', format: 'date-time' },
                version:       { type: 'string' },
                response_time: { type: 'number' },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status:  { type: 'string', enum: ['ok', 'degraded'] },
            backend: { type: 'string', example: 'clara-backend' },
            ai_service: {
              type: 'object',
              properties: {
                status:  { type: 'string' },
                version: { type: 'string' },
                device:  { type: 'string' },
                env:     { type: 'string' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
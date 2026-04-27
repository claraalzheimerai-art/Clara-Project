import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import { uploadAndAnalyze } from '../controllers/upload.controller';
import { uploadMiddleware } from '../config/multer.config';
import { validateUpload } from '../middlewares/validate.middleware';
import { analysisLimiter } from '../middlewares/security.middleware';

const router = Router();
/**
 * @openapi
 * /analysis/health:
 *   get:
 *     summary: Estado del backend y AI Service
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Ambos servicios operativos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: AI Service no disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/health', healthCheck);
/**
 * @openapi
 * /analysis/upload:
 *   post:
 *     summary: Analizar imagen MRI
 *     description: |
 *       Recibe una imagen MRI en formato NIfTI (.nii, .nii.gz) o DICOM (.dcm),
 *       la clasifica con ResNet50 en CN/MCI/AD y genera el mapa Grad-CAM.
 *       
 *       El resultado también se emite via **Socket.IO** al evento `analysis:complete`.
 *     tags: [Análisis]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [mriFile]
 *             properties:
 *               mriFile:
 *                 type: string
 *                 format: binary
 *                 description: Imagen MRI en formato .nii, .nii.gz o .dcm
 *     responses:
 *       200:
 *         description: Análisis completado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AnalysisResult'
 *       400:
 *         description: Archivo no enviado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Límite de análisis excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/upload',
  analysisLimiter,
  uploadMiddleware.single('mriFile'),
  validateUpload,
  uploadAndAnalyze,
);

export default router;
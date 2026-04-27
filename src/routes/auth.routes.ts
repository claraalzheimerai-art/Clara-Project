import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  getProfile,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, password]
 *             properties:
 *               nombre:   { type: string }
 *               apellido: { type: string }
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: Cuenta creada exitosamente
 *       409:
 *         description: Email ya registrado
 */
router.post('/register', register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login exitoso con tokens JWT
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', login);

/**
 * @openapi
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verificar email
 *     tags: [Autenticación]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email verificado
 *       400:
 *         description: Token inválido
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Solicitar reset de contraseña
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Instrucciones enviadas
 *       404:
 *         description: Email no encontrado
 */
router.post('/forgot-password', forgotPassword);

/**
 * @openapi
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Restablecer contraseña
 *     tags: [Autenticación]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Contraseña restablecida
 *       400:
 *         description: Token inválido o expirado
 */
router.post('/reset-password/:token', resetPassword);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Renovar access token
 *     tags: [Autenticación]
 *     responses:
 *       200:
 *         description: Nuevos tokens generados
 *       401:
 *         description: Refresh token inválido
 */
router.post('/refresh-token', refreshToken);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: No autenticado
 */
router.get('/profile', authenticate, getProfile);

export default router;
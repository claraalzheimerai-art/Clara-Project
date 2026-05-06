// ============================================================
// CLARA — Auth Routes (completo con reset password)
// ============================================================

import { Router } from 'express';
import {
  changePassword,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  updateMe,
} from '../controllers/auth.controller';
import {
  verifyEmail,
  resendVerification,
} from '../controllers/email.verification.controller';
import {
  forgotPassword,
  resetPassword,
} from '../controllers/reset.password.controller';
import { authenticate } from '../middlewares/jwt.middleware';
import {
  validateChangePassword,
  validateLogin,
  validateRegister,
} from '../middlewares/auth.validation.middleware';

const router = Router();

// ── Públicas ─────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar nuevo usuario (envía email de verificación)
 */
router.post('/register', validateRegister, register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión (requiere email verificado)
 */
router.post('/login',    validateLogin,    login);

router.post('/refresh',  refreshToken);
router.post('/logout',   logout);

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verificar email con token recibido por correo
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/verify-email', verifyEmail);

/**
 * @openapi
 * /api/v1/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Reenviar correo de verificación
 */
router.post('/resend-verification', resendVerification);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar enlace de recuperación de contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: medico@hospital.com
 */
router.post('/forgot-password', forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Restablecer contraseña con token del email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token recibido por email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Nueva contraseña
 */
router.post('/reset-password', resetPassword);

// ── Protegidas ───────────────────────────────────────────────
router.get   ('/me',          authenticate,                         getMe);
router.patch ('/me',          authenticate,                         updateMe);
router.patch ('/me/password', authenticate, validateChangePassword, changePassword);

export default router;
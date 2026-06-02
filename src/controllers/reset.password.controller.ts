// ============================================================
// CLARA — Reset Password Controller
// POST /api/v1/auth/forgot-password
// POST /api/v1/auth/reset-password
// ============================================================

import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../models/user.model';
import { EmailService } from '../services/email.service';
import { AUTH_CONSTANTS } from '../types/auth.types';
import { logger } from '../utils/logger';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

function badRequest(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    message,
    meta: { timestamp: new Date().toISOString() },
  });
}

// ── POST /api/v1/auth/forgot-password ────────────────────────
// Body: { email }
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body ?? {};

    if (!email || typeof email !== 'string') {
      badRequest(res, 'El correo electrónico es requerido');
      return;
    }

    // Respuesta genérica siempre — no revela si el email existe
    const genericOk = {
      message: 'Si el correo está registrado recibirás un enlace para restablecer tu contraseña.',
    };

    const user = await UserModel.findByEmail(email);
    if (!user) {
      ok(res, genericOk);
      return;
    }

    const resetToken  = uuidv4();
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await UserModel.update(user.id, {
      reset_token:        resetToken,
      reset_token_expiry: resetExpiry,
    });

    await EmailService.sendResetPasswordEmail({
      to:     user.email,
      nombre: user.nombre,
      token:  resetToken,
    });

    logger.info(`Reset password solicitado: ${user.email} — token generado`);
    ok(res, genericOk);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v1/auth/reset-password ────────────────────────
// Body: { token, password }
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body ?? {};

    if (!token || typeof token !== 'string') {
      badRequest(res, 'El token de recuperación es requerido');
      return;
    }

    if (!password || typeof password !== 'string') {
      badRequest(res, 'La nueva contraseña es requerida');
      return;
    }

    if (password.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
      badRequest(
        res,
        `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
      );
      return;
    }

    // findByResetToken ya valida que reset_token_expiry > NOW() en la query SQL
    const user = await UserModel.findByResetToken(token);

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'El enlace de recuperación es inválido o ha expirado',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_ROUNDS);

    await UserModel.update(user.id, {
      password:           passwordHash,
      reset_token:        null,   // invalida el token tras usarlo
      reset_token_expiry: null,
    });

    logger.info(`Contraseña restablecida: ${user.email} (id=${user.id})`);

    ok(res, {
      message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    });
  } catch (err) {
    next(err);
  }
}
// ============================================================
// CLARA — Email Verification Controller
// ============================================================

import { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

// GET /api/v1/auth/verify-email?token=xxx
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Token de verificación requerido',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const user = await UserModel.findByVerificationToken(token);

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Token de verificación inválido o ya utilizado',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    if (user.email_verified) {
      ok(res, { message: 'Tu cuenta ya estaba verificada. Puedes iniciar sesión.' });
      return;
    }

    await UserModel.update(user.id, {
      email_verified:     true,
      verification_token: null,   // invalida el token tras usarlo
    });

    logger.info(`Email verificado: ${user.email} (id=${user.id})`);

    ok(res, {
      message:  'Cuenta verificada correctamente. Ya puedes iniciar sesión.',
      email:    user.email,
      nombre:   user.nombre,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/resend-verification
// Body: { email }
export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body ?? {};

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const user = await UserModel.findByEmail(email);

    // Respuesta genérica — no revela si el email existe o no
    const genericResponse = {
      message: 'Si el correo está registrado y sin verificar, recibirás un nuevo enlace en breve.',
    };

    if (!user || user.email_verified) {
      ok(res, genericResponse);
      return;
    }

    // Genera nuevo token y actualiza BD
    const newToken = uuidv4();
    await UserModel.update(user.id, { verification_token: newToken });

    await EmailService.sendVerificationEmail({
      to:     user.email,
      nombre: user.nombre,
      token:  newToken,
    });

    logger.info(`Verificación reenviada a: ${user.email}`);
    ok(res, genericResponse);
  } catch (err) {
    next(err);
  }
}
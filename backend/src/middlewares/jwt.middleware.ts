// ============================================================
// CLARA — JWT Middleware (sub: number)
// ============================================================

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'fallback-secret-only-for-tests';
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, getJwtSecret()) as unknown as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError ? 'Token expirado' : 'Token inválido';

    res.status(401).json({
      success: false,
      message,
      meta: { timestamp: new Date().toISOString() },
    });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    next();
  };
}
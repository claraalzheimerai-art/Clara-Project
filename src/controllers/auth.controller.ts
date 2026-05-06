// ============================================================
// CLARA — Auth Controller (userId: number)
// ============================================================

import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from '../types/auth.types';

function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

// POST /api/v1/auth/register
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AuthService.register(req.body as RegisterDto);
    ok(res, result, 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AuthService.login(req.body as LoginDto);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/refresh
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        message: 'refreshToken requerido',
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }
    const result = await AuthService.refreshToken(refreshToken);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body ?? {};
    if (refreshToken) await AuthService.logout(refreshToken);
    ok(res, { message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/me
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await AuthService.getProfile(req.user!.sub);
    ok(res, user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/auth/me
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nombre, apellido, especialidad, institucion, telefono } = req.body;
    const user = await AuthService.updateProfile(req.user!.sub, {
      nombre, apellido, especialidad, institucion, telefono,
    });
    ok(res, user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/auth/me/password
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await AuthService.changePassword(req.user!.sub, req.body as ChangePasswordDto);
    ok(res, { message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}
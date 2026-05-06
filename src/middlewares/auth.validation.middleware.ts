// ============================================================
// CLARA — Auth Validation Middleware
// ============================================================

import { NextFunction, Request, Response } from 'express';

// Regex simple para email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// Register Validation
// ============================================================

export function validateRegister(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { nombre, email, password } = req.body;

  // Campos requeridos
  if (!nombre || !email || !password) {
    res.status(400).json({
      success: false,
      message: 'Nombre, email y contraseña son obligatorios',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // Nombre
  if (typeof nombre !== 'string' || nombre.trim().length < 2) {
    res.status(400).json({
      success: false,
      message: 'El nombre debe tener al menos 2 caracteres',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // Email
  if (typeof email !== 'string' || !emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      message: 'Correo electrónico inválido',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // Password
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({
      success: false,
      message: 'La contraseña debe tener mínimo 8 caracteres',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  next();
}

// ============================================================
// Login Validation
// ============================================================

export function validateLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Email y contraseña son obligatorios',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (typeof email !== 'string' || !emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      message: 'Correo electrónico inválido',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (typeof password !== 'string' || password.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Contraseña inválida',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  next();
}

// ============================================================
// Change Password Validation
// ============================================================

export function validateChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({
      success: false,
      message: 'Debes enviar la contraseña actual y la nueva',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (typeof currentPassword !== 'string') {
    res.status(400).json({
      success: false,
      message: 'La contraseña actual es inválida',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener mínimo 8 caracteres',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (currentPassword === newPassword) {
    res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe ser diferente a la actual',
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  next();
}
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse, errorResponse } from '../models/api.model';
import { logger } from '../utils/logger';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
      res.status(400).json(errorResponse('Todos los campos son requeridos'));
      return;
    }

    const user = await authService.register({ nombre, apellido, email, password });

    res.status(201).json(successResponse({
      message:           'Cuenta creada. Revisa tu email para verificarla.',
      verificationToken: user.verificationToken,
      email:             user.email,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes('registrado')) {
      res.status(409).json(errorResponse(error.message));
      return;
    }
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json(errorResponse('Email y contraseña son requeridos'));
      return;
    }

    const { user, tokens } = await authService.login({ email, password });

    res.json(successResponse({
      user: {
        id:       user._id,
        nombre:   user.nombre,
        apellido: user.apellido,
        email:    user.email,
        role:     user.role,
      },
      tokens,
    }));
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json(errorResponse(error.message));
      return;
    }
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    await authService.verifyEmail(token);
    res.json(successResponse({ message: 'Email verificado exitosamente' }));
  } catch (error) {
    res.status(400).json(errorResponse('Token de verificación inválido'));
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json(errorResponse('Email es requerido'));
      return;
    }
    const resetToken = await authService.forgotPassword(email);
    res.json(successResponse({
      message:    'Instrucciones enviadas a tu email',
      resetToken,
    }));
  } catch (error) {
    res.status(404).json(errorResponse('Email no encontrado'));
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token           = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json(errorResponse('La contraseña debe tener al menos 8 caracteres'));
      return;
    }

    await authService.resetPassword(token, newPassword);
    res.json(successResponse({ message: 'Contraseña restablecida exitosamente' }));
  } catch (error) {
    res.status(400).json(errorResponse('Token inválido o expirado'));
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json(errorResponse('Refresh token requerido'));
      return;
    }
    const tokens = await authService.refreshTokens(refreshToken);
    res.json(successResponse({ tokens }));
  } catch (error) {
    res.status(401).json(errorResponse('Refresh token inválido o expirado'));
  }
};

export const getProfile = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { User } = await import('../models/user.model');
    const user     = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json(errorResponse('Usuario no encontrado'));
      return;
    }
    res.json(successResponse({
      id:            user._id,
      nombre:        user.nombre,
      apellido:      user.apellido,
      email:         user.email,
      role:          user.role,
      emailVerified: user.emailVerified,
      createdAt:     user.createdAt,
    }));
  } catch (error) {
    next(error);
  }
};
// ============================================================
// CLARA — Auth Types
// DTOs y tipos de respuesta (user.model.ts vive en MySQL)
// ============================================================

import { IUser } from '../models/user.model';

export interface JwtPayload {
  sub:    number;      // user id (number, igual que IUser.id)
  email:  string;
  rol:    string;
  nombre: string;
  iat?:   number;
  exp?:   number;
}

export interface RegisterDto {
  nombre:       string;
  apellido:     string;
  email:        string;
  password:     string;
  especialidad?: string;
  institucion?:  string;
  telefono?:     string;
}

export interface LoginDto {
  email:    string;
  password: string;
}

export interface ChangePasswordDto {
  passwordActual: string;
  passwordNuevo:  string;
}

// Usuario sin password (lo que se manda al cliente)
export type PublicUser = Omit<IUser, 'password' | 'verification_token' | 'reset_token' | 'reset_token_expiry'>;

export interface AuthResponse {
  token:        string;
  refreshToken: string;
  user:         PublicUser;
}

export const AUTH_CONSTANTS = {
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_EXPIRY:        '8h',
  REFRESH_TOKEN_EXPIRY: '7d',
  BCRYPT_ROUNDS:       12,
} as const;

export function toPublicUser(user: IUser): PublicUser {
  const {
    password,
    verification_token,
    reset_token,
    reset_token_expiry,
    ...publicUser
  } = user;
  return publicUser;
}
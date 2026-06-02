// ============================================================
// CLARA — User Model Unit Tests
// Mock de getPool para no requerir MySQL en tests
// ============================================================

// Mock ANTES de cualquier import que use la BD
const mockQuery   = jest.fn();
const mockRelease = jest.fn();
const mockGetConnection = jest.fn().mockResolvedValue({
  query:   mockQuery,
  release: mockRelease,
});

jest.mock('../../config/database.config', () => ({
  getPool: jest.fn().mockReturnValue({
    query:         mockQuery,
    getConnection: mockGetConnection,
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// bcryptjs — mockeamos para evitar el costo de hash en tests
jest.mock('bcryptjs', () => ({
  genSalt:  jest.fn().mockResolvedValue('salt'),
  hash:     jest.fn().mockResolvedValue('$2a$12$hashedPassword'),
  compare:  jest.fn().mockResolvedValue(true),
}));

import { UserModel } from '../../models/user.model';
import bcrypt from 'bcryptjs';

const mockBcryptCompare = bcrypt.compare as jest.Mock;

// Helper — fila de BD simulada
function fakeRow(overrides = {}): any {
  return {
    id:                 1,
    nombre:             'Ana',
    apellido:           'López',
    email:              'ana@hospital.com',
    password:           '$2a$12$hashedPassword',
    role:               'medico',
    email_verified:     true,
    verification_token: null,
    reset_token:        null,
    reset_token_expiry: null,
    created_at:         new Date(),
    updated_at:         new Date(),
    ...overrides,
  };
}

describe('UserModel', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── findByEmail() ──────────────────────────────────────────
  describe('findByEmail()', () => {
    it('retorna el usuario si existe', async () => {
      mockQuery.mockResolvedValue([[fakeRow()]]);

      const user = await UserModel.findByEmail('ana@hospital.com');

      expect(user).not.toBeNull();
      expect(user!.email).toBe('ana@hospital.com');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = ?'),
        ['ana@hospital.com'],
      );
    });

    it('retorna null si no existe', async () => {
      mockQuery.mockResolvedValue([[]]);

      const user = await UserModel.findByEmail('noexiste@test.com');

      expect(user).toBeNull();
    });
  });

  // ── findById() ─────────────────────────────────────────────
  describe('findById()', () => {
    it('retorna el usuario por id', async () => {
      mockQuery.mockResolvedValue([[fakeRow({ id: 42 })]]);

      const user = await UserModel.findById(42);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(42);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        [42],
      );
    });

    it('retorna null si no existe', async () => {
      mockQuery.mockResolvedValue([[]]);

      const user = await UserModel.findById(99);

      expect(user).toBeNull();
    });
  });

  // ── findByVerificationToken() ──────────────────────────────
  describe('findByVerificationToken()', () => {
    it('retorna usuario con el token dado', async () => {
      mockQuery.mockResolvedValue([[fakeRow({ verification_token: 'token-uuid' })]]);

      const user = await UserModel.findByVerificationToken('token-uuid');

      expect(user).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('verification_token = ?'),
        ['token-uuid'],
      );
    });

    it('retorna null si el token no existe', async () => {
      mockQuery.mockResolvedValue([[]]);

      const user = await UserModel.findByVerificationToken('token-invalido');

      expect(user).toBeNull();
    });
  });

  // ── findByResetToken() ─────────────────────────────────────
  describe('findByResetToken()', () => {
    it('retorna usuario con token de reset válido y no expirado', async () => {
      mockQuery.mockResolvedValue([[fakeRow({ reset_token: 'reset-uuid' })]]);

      const user = await UserModel.findByResetToken('reset-uuid');

      expect(user).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('reset_token = ?'),
        ['reset-uuid'],
      );
    });

    it('retorna null si el token expiró (query no retorna filas)', async () => {
      mockQuery.mockResolvedValue([[]]);

      const user = await UserModel.findByResetToken('token-expirado');

      expect(user).toBeNull();
    });
  });

  // ── create() ───────────────────────────────────────────────
  describe('create()', () => {
    it('inserta el usuario y retorna el registro creado', async () => {
      // Primera llamada: INSERT → retorna insertId
      // Segunda llamada: SELECT (findById interno) → retorna el usuario
      mockQuery
        .mockResolvedValueOnce([{ insertId: 7 }])
        .mockResolvedValueOnce([[fakeRow({ id: 7 })]]);

      const user = await UserModel.create({
        nombre:   'Ana',
        apellido: 'López',
        email:    'ana@hospital.com',
        password: 'Segura123!',
      });

      expect(user.id).toBe(7);
      expect(user.email).toBe('ana@hospital.com');

      // Verifica que la contraseña se hasheó antes de insertar
      expect(bcrypt.hash).toHaveBeenCalledWith('Segura123!', expect.anything());

      // Verifica que el INSERT contiene los campos correctos
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['ana@hospital.com']),
      );
    });

    it('normaliza el email a minúsculas', async () => {
      mockQuery
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[fakeRow()]]);

      await UserModel.create({
        nombre:   'X',
        apellido: 'Y',
        email:    'ANA@HOSPITAL.COM',
        password: 'Pass1234!',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['ana@hospital.com']),
      );
    });

    it('asigna rol "medico" por defecto', async () => {
      mockQuery
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[fakeRow()]]);

      await UserModel.create({
        nombre: 'X', apellido: 'Y', email: 'x@y.com', password: 'Pass1234!',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(['medico']),
      );
    });
  });

  // ── update() ───────────────────────────────────────────────
  describe('update()', () => {
    it('ejecuta UPDATE con los campos dados', async () => {
      mockQuery.mockResolvedValue([{}]);

      await UserModel.update(1, { email_verified: true, verification_token: null });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        expect.arrayContaining([1]),
      );
    });

    it('no ejecuta query si fields está vacío', async () => {
      await UserModel.update(1, {});

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  // ── comparePassword() ──────────────────────────────────────
  describe('comparePassword()', () => {
    it('retorna true cuando la contraseña coincide', async () => {
      mockBcryptCompare.mockResolvedValue(true);

      const result = await UserModel.comparePassword('Segura123!', '$2a$12$hash');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('Segura123!', '$2a$12$hash');
    });

    it('retorna false cuando la contraseña no coincide', async () => {
      mockBcryptCompare.mockResolvedValue(false);

      const result = await UserModel.comparePassword('Incorrecta', '$2a$12$hash');

      expect(result).toBe(false);
    });
  });
});
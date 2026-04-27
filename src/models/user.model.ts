import bcrypt from 'bcryptjs';
import { getPool } from '../config/database.config';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export type UserRole = 'medico' | 'admin';

export interface IUser {
  id:                number;
  nombre:            string;
  apellido:          string;
  email:             string;
  password:          string;
  role:              UserRole;
  email_verified:    boolean;
  verification_token: string | null;
  reset_token:       string | null;
  reset_token_expiry: Date | null;
  created_at:        Date;
  updated_at:        Date;
}

export interface IUserWithMethods extends IUser {
  comparePassword(candidate: string): Promise<boolean>;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export const UserModel = {

  async findByEmail(email: string): Promise<IUser | null> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return (rows[0] as IUser) ?? null;
  },

  async findById(id: number): Promise<IUser | null> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return (rows[0] as IUser) ?? null;
  },

  async findByVerificationToken(token: string): Promise<IUser | null> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE verification_token = ? LIMIT 1',
      [token]
    );
    return (rows[0] as IUser) ?? null;
  },

  async findByResetToken(token: string): Promise<IUser | null> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM users 
       WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1`,
      [token]
    );
    return (rows[0] as IUser) ?? null;
  },

  async create(data: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    role?: UserRole;
    verification_token?: string;
  }): Promise<IUser> {
    const pool = getPool();
    const salt     = await bcrypt.genSalt(12);
    const hashed   = await bcrypt.hash(data.password, salt);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users 
        (nombre, apellido, email, password, role, verification_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        data.apellido,
        data.email.toLowerCase().trim(),
        hashed,
        data.role ?? 'medico',
        data.verification_token ?? null,
      ]
    );

    return (await this.findById(result.insertId))!;
  },

  async update(id: number, fields: Partial<Omit<IUser, 'id' | 'created_at'>>): Promise<void> {
    const pool    = getPool();
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;

    const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
    const values    = entries.map(([, v]) => v);

    await pool.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  },

  async comparePassword(candidate: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(candidate, hashed);
  },
};
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { getPool } from '../config/database.config';

export type UserRole = 'medico' | 'admin';

export interface IUser {
  id:                 number;
  nombre:             string;
  apellido:           string;
  email:              string;
  password:           string;
  role:               UserRole;
  email_verified:     boolean;
  verification_token: string | null;
  reset_token:        string | null;
  reset_token_expiry: Date | null;
  created_at:         Date;
  updated_at:         Date;
}

export interface IUserWithMethods extends IUser {
  comparePassword(candidate: string): Promise<boolean>;
}

// Infiere el tipo mssql según el valor JS para el UPDATE dinámico
function sqlType(value: unknown): sql.ISqlTypeFactoryWithNoParams | sql.ISqlTypeWithLength {
  if (value === null || value === undefined) return sql.NVarChar(sql.MAX);
  if (typeof value === 'number')             return sql.Int;
  if (typeof value === 'boolean')            return sql.Bit;
  if (value instanceof Date)                 return sql.DateTime;
  return sql.NVarChar(sql.MAX);
}

// ─── Queries ────────────────────────────────────────────────────────────────

export const UserModel = {

  async findByEmail(email: string): Promise<IUser | null> {
    const pool = getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT TOP 1 * FROM users WHERE email = @email');
    return (result.recordset[0] as IUser) ?? null;
  },

  async findById(id: number): Promise<IUser | null> {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT TOP 1 * FROM users WHERE id = @id');
    return (result.recordset[0] as IUser) ?? null;
  },

  async findByVerificationToken(token: string): Promise<IUser | null> {
    const pool = getPool();
    const result = await pool.request()
      .input('token', sql.NVarChar(36), token)
      .query('SELECT TOP 1 * FROM users WHERE verification_token = @token');
    return (result.recordset[0] as IUser) ?? null;
  },

  async findByResetToken(token: string): Promise<IUser | null> {
    const pool = getPool();
    const result = await pool.request()
      .input('token', sql.NVarChar(36), token)
      .query(`SELECT TOP 1 * FROM users
              WHERE reset_token = @token AND reset_token_expiry > GETDATE()`);
    return (result.recordset[0] as IUser) ?? null;
  },

  async create(data: {
    nombre:              string;
    apellido:            string;
    email:               string;
    password:            string;
    role?:               UserRole;
    verification_token?: string;
  }): Promise<IUser> {
    const pool   = getPool();
    const salt   = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(data.password, salt);

    const result = await pool.request()
      .input('nombre',             sql.NVarChar(100), data.nombre)
      .input('apellido',           sql.NVarChar(100), data.apellido)
      .input('email',              sql.NVarChar(255), data.email.toLowerCase().trim())
      .input('password',           sql.NVarChar(255), hashed)
      .input('role',               sql.NVarChar(10),  data.role ?? 'medico')
      .input('verification_token', sql.NVarChar(36),  data.verification_token ?? null)
      .query(`INSERT INTO users (nombre, apellido, email, password, role, verification_token)
              OUTPUT INSERTED.id
              VALUES (@nombre, @apellido, @email, @password, @role, @verification_token)`);

    const insertId: number = result.recordset[0].id;
    return (await this.findById(insertId))!;
  },

  async update(id: number, fields: Partial<Omit<IUser, 'id' | 'created_at'>>): Promise<void> {
    const pool    = getPool();
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;

    const request = pool.request();
    request.input('id', sql.Int, id);

    const setClause = entries.map(([k, v]) => {
      request.input(k, sqlType(v), v ?? null);
      return `${k} = @${k}`;
    }).join(', ');

    await request.query(
      `UPDATE users SET ${setClause}, updated_at = GETDATE() WHERE id = @id`,
    );
  },

  async comparePassword(candidate: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(candidate, hashed);
  },
};

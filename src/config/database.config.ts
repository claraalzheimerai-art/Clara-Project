import mysql, { Pool } from 'mysql2/promise';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MySQL_URI;

  if (!uri) {
    throw new Error('MySQL_URI no está definida en las variables de entorno');
  }

  try {
    pool = mysql.createPool(uri);
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1');
    connection.release();
    logger.info('MySQL conectado correctamente');
  } catch (error) {
    logger.error('Error conectando a MySQL:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL desconectado');
  }
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('No hay conexión activa a MySQL. Llama connectDB() primero.');
  }
  return pool;
};
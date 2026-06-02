import sql, { ConnectionPool } from 'mssql';
import { logger } from '../utils/logger';

let pool: ConnectionPool | null = null;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.SQLSERVER_URI;

  if (!uri) {
    throw new Error('SQLSERVER_URI no está definida en las variables de entorno');
  }

  try {
    pool = await sql.connect(uri);
    await pool.request().query('SELECT 1');
    logger.info('SQL Server conectado correctamente');
  } catch (error) {
    logger.error('Error conectando a SQL Server:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('SQL Server desconectado');
  }
};

export const getPool = (): ConnectionPool => {
  if (!pool) {
    throw new Error('No hay conexión activa a SQL Server. Llama connectDB() primero.');
  }
  return pool;
};

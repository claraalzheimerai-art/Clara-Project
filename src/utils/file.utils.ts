import fs from 'fs';
import { logger } from './logger';

export const deleteTempFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Archivo temporal eliminado: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error al eliminar archivo temporal: ${filePath}`, error);
  }
};

export const isValidFile = (filePath: string): boolean => {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
};
import { Request, Response, NextFunction } from 'express';
import { isValidFile } from '../utils/file.utils';

export const validateUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      message: 'Archivo requerido. Suba una imagen MRI en formato .nii, .nii.gz o .dcm',
    });
    return;
  }

  if (!isValidFile(file.path)) {
    res.status(400).json({ message: 'El archivo recibido está vacío o es inválido.' });
    return;
  }

  next();
};
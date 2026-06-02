import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { ENV } from './env.config';

const ALLOWED_EXTENSIONS = ['.nii', '.nii.gz', '.dcm', '.img', '.zip'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ENV.UPLOAD.TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    // Preservar extensión compuesta (.nii.gz) correctamente
    const name = file.originalname.toLowerCase();
    const ext  = name.endsWith('.nii.gz') ? '.nii.gz'
               : path.extname(name);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const extOk = ALLOWED_EXTENSIONS.some((e) => file.originalname.toLowerCase().endsWith(e));
  if (extOk) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido. Use .nii, .nii.gz, .dcm, .img o .zip (serie DICOM)`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: ENV.UPLOAD.MAX_SIZE_BYTES },
});
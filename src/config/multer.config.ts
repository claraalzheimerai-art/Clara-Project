import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { ENV } from './env.config';

const ALLOWED_EXTENSIONS = ['.nii', '.nii.gz', '.dcm'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ENV.UPLOAD.TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const extOk = ALLOWED_EXTENSIONS.some((e) => file.originalname.endsWith(e));
  if (extOk) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido. Use .nii, .nii.gz o .dcm`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: ENV.UPLOAD.MAX_SIZE_BYTES },
});
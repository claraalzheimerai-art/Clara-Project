import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../middlewares/error.middleware';
import { validateUpload } from '../../middlewares/validate.middleware';

jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/file.utils', () => ({
  isValidFile:     jest.fn(),
  deleteTempFile:  jest.fn(),
}));

import { isValidFile } from '../../utils/file.utils';
const mockedIsValidFile = isValidFile as jest.MockedFunction<typeof isValidFile>;

const mockRes = () => {
  const res = {} as Response;
  res.status     = jest.fn().mockReturnValue(res);
  res.json       = jest.fn().mockReturnValue(res);
  res.statusCode = 200;
  return res;
};

const mockNext = jest.fn() as unknown as NextFunction;

describe('error.middleware', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('notFoundHandler', () => {
    it('responde 404 con mensaje de ruta no encontrada', () => {
      const req = { method: 'POST', originalUrl: '/no-existe' } as Request;
      const res = mockRes();

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('no encontrada') })
      );
    });
  });

  describe('errorHandler', () => {
    it('usa statusCode del response si no es 200', () => {
      const req  = {} as Request;
      const res  = mockRes();
      res.statusCode = 422;

      errorHandler(new Error('Validation error'), req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Validation error' })
      );
    });

    it('responde 500 cuando statusCode es 200', () => {
      const req = {} as Request;
      const res = mockRes();
      res.statusCode = 200;

      errorHandler(new Error('Error inesperado'), req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('usa mensaje genérico si error no tiene message', () => {
      const req = {} as Request;
      const res = mockRes();
      res.statusCode = 500;

      errorHandler(new Error(), req, res, mockNext);

      expect(res.json).toHaveBeenCalled();
    });
  });
});

describe('validate.middleware', () => {

  beforeEach(() => jest.clearAllMocks());

  it('responde 400 si no hay archivo', () => {
    const req  = { file: undefined } as Request;
    const res  = mockRes();

    validateUpload(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Archivo requerido') })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('responde 400 si el archivo es inválido', () => {
    mockedIsValidFile.mockReturnValue(false);

    const req = {
      file: { path: '/tmp/test.nii', originalname: 'test.nii' }
    } as unknown as Request;
    const res = mockRes();

    validateUpload(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('llama next() si el archivo es válido', () => {
    mockedIsValidFile.mockReturnValue(true);

    const req = {
      file: { path: '/tmp/test.nii', originalname: 'test.nii' }
    } as unknown as Request;
    const res = mockRes();

    validateUpload(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
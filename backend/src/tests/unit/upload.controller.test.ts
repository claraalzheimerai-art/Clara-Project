jest.mock('../../services/ai.service', () => ({
  aiService: {
    health:  jest.fn(),
    predict: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/file.utils', () => ({
  deleteTempFile: jest.fn(),
  isValidFile:    jest.fn(),
}));

jest.mock('../../socket', () => ({
  SOCKET_EVENTS: {
    ANALYSIS_STARTED:  'analysis:started',
    ANALYSIS_PROGRESS: 'analysis:progress',
    ANALYSIS_COMPLETE: 'analysis:complete',
    ANALYSIS_ERROR:    'analysis:error',
  },
  emitToAll:      jest.fn(),
  emitToAnalysis: jest.fn(),
}));

import { Request, Response, NextFunction } from 'express';
import { aiService } from '../../services/ai.service';
import { uploadAndAnalyze } from '../../controllers/upload.controller';
import { emitToAll } from '../../socket';
import { deleteTempFile } from '../../utils/file.utils';

const mockedAiService  = aiService as jest.Mocked<typeof aiService>;
const mockedEmitToAll  = emitToAll as jest.MockedFunction<typeof emitToAll>;
const mockedDeleteFile = deleteTempFile as jest.MockedFunction<typeof deleteTempFile>;

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as unknown as NextFunction;

const mockIo = { emit: jest.fn() };

const mockFile = {
  path:         '/tmp/test.nii',
  originalname: 'scan.nii',
  size:         1024,
  mimetype:     'application/octet-stream',
} as Express.Multer.File;

describe('upload.controller', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('uploadAndAnalyze()', () => {

    it('retorna 400 si no hay archivo', async () => {
      const req = {
        file:    undefined,
        app:     { get: jest.fn().mockReturnValue(null) },
      } as unknown as Request;
      const res = mockRes();

      await uploadAndAnalyze(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('archivo') })
      );
    });

    it('retorna resultado exitoso con Socket.IO', async () => {
      const mockResult = {
        filename:      'scan.nii',
        prediction: {
          label:         'CN' as const,
          confidence:    0.92,
          probabilities: { CN: 0.92, MCI: 0.05, AD: 0.03 },
        },
        gradcam:       'data:image/png;base64,abc',
        model_version: '1.0.0',
      };
      mockedAiService.predict.mockResolvedValue(mockResult);

      const req = {
        file: mockFile,
        app:  { get: jest.fn().mockReturnValue(mockIo) },
      } as unknown as Request;
      const res = mockRes();

      await uploadAndAnalyze(req, res, mockNext);

      expect(mockedAiService.predict).toHaveBeenCalledWith(
        mockFile.path,
        mockFile.originalname
      );
      expect(res.json).toHaveBeenCalled();
      expect(mockedEmitToAll).toHaveBeenCalled();
      expect(mockedDeleteFile).toHaveBeenCalledWith(mockFile.path);
    });

    it('retorna resultado exitoso sin Socket.IO', async () => {
      const mockResult = {
        filename:      'scan.nii',
        prediction: {
          label:         'AD' as const,
          confidence:    0.88,
          probabilities: { CN: 0.05, MCI: 0.07, AD: 0.88 },
        },
        gradcam:       'data:image/png;base64,xyz',
        model_version: '1.0.0',
      };
      mockedAiService.predict.mockResolvedValue(mockResult);

      const req = {
        file: mockFile,
        app:  { get: jest.fn().mockReturnValue(null) },
      } as unknown as Request;
      const res = mockRes();

      await uploadAndAnalyze(req, res, mockNext);

      expect(res.json).toHaveBeenCalled();
      expect(mockedDeleteFile).toHaveBeenCalledWith(mockFile.path);
    });

    it('llama next(error) cuando AI Service falla', async () => {
      mockedAiService.predict.mockRejectedValue(new Error('AI Service caído'));

      const req = {
        file: mockFile,
        app:  { get: jest.fn().mockReturnValue(mockIo) },
      } as unknown as Request;
      const res = mockRes();

      await uploadAndAnalyze(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedDeleteFile).toHaveBeenCalledWith(mockFile.path);
    });

    it('emite ANALYSIS_ERROR cuando AI Service falla con io', async () => {
      mockedAiService.predict.mockRejectedValue(new Error('timeout'));

      const req = {
        file: mockFile,
        app:  { get: jest.fn().mockReturnValue(mockIo) },
      } as unknown as Request;
      const res = mockRes();

      await uploadAndAnalyze(req, res, mockNext);

      expect(mockedEmitToAll).toHaveBeenCalledWith(
        mockIo,
        'analysis:error',
        expect.objectContaining({ code: 'ANALYSIS_FAILED' })
      );
    });
  });
});
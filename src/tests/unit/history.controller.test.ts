jest.mock('../../services/history.service', () => ({
  historyService: {
    findAll:    jest.fn(),
    findById:   jest.fn(),
    getStats:   jest.fn(),
    deleteById: jest.fn(),
    clear:      jest.fn(),
    count:      jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response } from 'express';
import { historyService } from '../../services/history.service';
import {
  getHistory,
  getHistoryById,
  getHistoryStats,
  deleteHistoryEntry,
  clearHistory,
} from '../../controllers/history.controller';

const mock = historyService as jest.Mocked<typeof historyService>;

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockEntry = {
  analysisId: 'test-1', filename: 'scan.nii', fileSize: 1024,
  diagnosticLabel: 'CN', diagnosticColor: '#22c55e', confidenceLevel: 'HIGH',
  confidence: 0.92, label: 'CN', requiresReview: false,
  modelVersion: '1.0.0', analyzedAt: new Date().toISOString(),
};

describe('history.controller', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('getHistory()', () => {
    it('retorna lista paginada', () => {
      mock.findAll.mockReturnValue([mockEntry]);
      mock.count.mockReturnValue(1);

      const req = { query: { limit: '10', offset: '0' } } as unknown as Request;
      const res = mockRes();

      getHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('usa valores por defecto si no hay query params', () => {
      mock.findAll.mockReturnValue([]);
      mock.count.mockReturnValue(0);

      const req = { query: {} } as unknown as Request;
      const res = mockRes();

      getHistory(req, res);
      expect(mock.findAll).toHaveBeenCalledWith(20, 0);
    });
  });

  describe('getHistoryById()', () => {
    it('retorna 200 si existe', () => {
      mock.findById.mockReturnValue(mockEntry);
      const req = { params: { id: 'test-1' } } as unknown as Request;
      const res = mockRes();

      getHistoryById(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('retorna 404 si no existe', () => {
      mock.findById.mockReturnValue(null);
      const req = { params: { id: 'no-existe' } } as unknown as Request;
      const res = mockRes();

      getHistoryById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getHistoryStats()', () => {
    it('retorna estadísticas', () => {
      mock.getStats.mockReturnValue({
        total: 5, byLabel: { CN: 3, MCI: 1, AD: 1 },
        byConfidence: { HIGH: 4, MEDIUM: 1, LOW: 0 },
        requiresReview: 0, lastAnalyzedAt: null,
      });

      const req = {} as Request;
      const res = mockRes();

      getHistoryStats(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deleteHistoryEntry()', () => {
    it('retorna 200 si elimina correctamente', () => {
      mock.deleteById.mockReturnValue(true);
      const req = { params: { id: 'test-1' } } as unknown as Request;
      const res = mockRes();

      deleteHistoryEntry(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('retorna 404 si no existe', () => {
      mock.deleteById.mockReturnValue(false);
      const req = { params: { id: 'no-existe' } } as unknown as Request;
      const res = mockRes();

      deleteHistoryEntry(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('clearHistory()', () => {
    it('limpia el historial y retorna 200', () => {
      const req = {} as Request;
      const res = mockRes();

      clearHistory(req, res);
      expect(mock.clear).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
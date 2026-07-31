/**
 * Pruebas unitarias: calificacionController
 */
import { Request, Response } from 'express';
import { listarCalificacionesPorEvaluacion, guardarCalificacion } from '../controllers/calificacionController';

jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../utils/authorization', () => ({
  verificarOwnershipEvaluacion: jest.fn(),
}));

const { query } = require('../db');
const { verificarOwnershipEvaluacion } = require('../utils/authorization');

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(params: any = {}, body: any = {}, user: any = { id_usuario: 1, rol: 'docente' }): Request {
  return {
    params,
    body,
    user,
  } as unknown as Request;
}

describe('calificacionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarCalificacionesPorEvaluacion', () => {
    test('debe listar calificaciones con ownership válido', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);
      query.mockResolvedValueOnce({
        rows: [
          {
            id_estudiante: 5,
            nombre_completo: 'Ana Pérez',
            cedula: '12345678',
            nota_preliminar: 15,
            nota_definitiva: null,
            observaciones: 'Bien',
            id_entrega: 10,
            formato_entrega: 'PDF',
            contenido: '/uploads/entrega.pdf',
            fecha_entrega: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      });

      const req = mockReq({ id: '1' });
      const res = mockRes();

      await listarCalificacionesPorEvaluacion(req, res);

      expect(verificarOwnershipEvaluacion).toHaveBeenCalledWith(1, req.user);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM evaluaciones ev'),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });

    test('debe rechazar ID inválido', async () => {
      const req = mockReq({ id: 'abc' });
      const res = mockRes();

      await listarCalificacionesPorEvaluacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('inválido') })
      );
    });

    test('debe rechazar si no es owner', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(false);

      const req = mockReq({ id: '1' });
      const res = mockRes();

      await listarCalificacionesPorEvaluacion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('guardarCalificacion', () => {
    test('debe crear o actualizar una calificación válida', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);
      query
        .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id_calificacion: 1,
            id_evaluacion: 1,
            id_estudiante: 5,
            nota_preliminar: 18,
            nota_definitiva: 17,
            observaciones: 'Excelente',
          }],
          rowCount: 1,
        });

      const req = mockReq({ id: '1' }, {
        id_estudiante: 5,
        nota_preliminar: 18,
        nota_definitiva: 17,
        observaciones: 'Excelente',
      });
      const res = mockRes();

      await guardarCalificacion(req, res);

      expect(verificarOwnershipEvaluacion).toHaveBeenCalledWith(1, req.user);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN matriculas m'),
        [1, 5]
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calificaciones'),
        expect.arrayContaining([1, 5, 18, 17, 'Excelente'])
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    test('debe permitir notas nulas (solo observaciones)', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);
      query
        .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id_calificacion: 1,
            id_evaluacion: 1,
            id_estudiante: 5,
            nota_preliminar: null,
            nota_definitiva: null,
            observaciones: 'Pendiente',
          }],
          rowCount: 1,
        });

      const req = mockReq({ id: '1' }, {
        id_estudiante: 5,
        observaciones: 'Pendiente',
      });
      const res = mockRes();

      await guardarCalificacion(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('debe rechazar nota fuera de rango', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);

      const req = mockReq({ id: '1' }, {
        id_estudiante: 5,
        nota_preliminar: 25,
      });
      const res = mockRes();

      await guardarCalificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(query).not.toHaveBeenCalled();
    });

    test('debe rechazar id_estudiante inválido', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);

      const req = mockReq({ id: '1' }, { id_estudiante: 'abc' });
      const res = mockRes();

      await guardarCalificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('debe manejar FK violada (23503)', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);
      query
        .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 })
        .mockRejectedValueOnce({ code: '23503', detail: 'id_evaluacion' });

      const req = mockReq({ id: '1' }, { id_estudiante: 5, nota_preliminar: 10 });
      const res = mockRes();

      await guardarCalificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('evaluación') })
      );
    });

    test('debe rechazar estudiante no matriculado en el curso', async () => {
      verificarOwnershipEvaluacion.mockResolvedValue(true);
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = mockReq({ id: '1' }, {
        id_estudiante: 99,
        nota_preliminar: 15,
        nota_definitiva: 16,
      });
      const res = mockRes();

      await guardarCalificacion(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN matriculas m'),
        [1, 99]
      );
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calificaciones'),
        expect.anything()
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'El estudiante no está matriculado en el curso de esta evaluación',
        })
      );
    });
  });
});

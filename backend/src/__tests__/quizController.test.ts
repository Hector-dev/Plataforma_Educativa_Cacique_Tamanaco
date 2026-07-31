/**
 * Pruebas unitarias: quizController (obtenerResultadosPorEvaluacion)
 */
import { Request, Response } from 'express';
import { obtenerResultadosPorEvaluacion } from '../controllers/quizController';

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

function mockReq(params: any = {}, user: any = { id_usuario: 1, rol: 'docente' }): Request {
  return {
    params,
    user,
  } as unknown as Request;
}

describe('obtenerResultadosPorEvaluacion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe retornar resultados de un quiz por evaluación', async () => {
    verificarOwnershipEvaluacion.mockResolvedValue(true);
    query
      .mockResolvedValueOnce({ rows: [{ id_quiz: 10 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id_estudiante: 5,
            nombre_completo: 'Ana Pérez',
            nota: 80,
            acertadas: 4,
            total_preguntas: 5,
            finalizado_en: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      });

    const req = mockReq({ id: '1' });
    const res = mockRes();

    await obtenerResultadosPorEvaluacion(req, res);

    expect(verificarOwnershipEvaluacion).toHaveBeenCalledWith(1, req.user);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id_quiz FROM quizzes'),
      [1]
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.any(Array) })
    );
  });

  test('debe rechazar ID inválido', async () => {
    const req = mockReq({ id: 'abc' });
    const res = mockRes();

    await obtenerResultadosPorEvaluacion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('debe rechazar si no es owner', async () => {
    verificarOwnershipEvaluacion.mockResolvedValue(false);

    const req = mockReq({ id: '1' });
    const res = mockRes();

    await obtenerResultadosPorEvaluacion(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('debe retornar 404 si no hay quiz para la evaluación', async () => {
    verificarOwnershipEvaluacion.mockResolvedValue(true);
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = mockReq({ id: '1' });
    const res = mockRes();

    await obtenerResultadosPorEvaluacion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

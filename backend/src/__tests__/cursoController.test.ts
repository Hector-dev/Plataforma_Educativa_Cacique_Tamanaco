/**
 * Pruebas unitarias: cursoController
 */
import { Request, Response } from 'express';
import { crearCurso, listarCursos, listarEstudiantesDisponibles } from '../controllers/cursoController';

jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { query } = require('../db');

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('cursoController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearCurso', () => {
    test('debe crear curso con datos válidos', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id_curso: 1, nombre: 'Matemáticas', id_docente: 1 }],
        rowCount: 1,
      });

      const req = {
        body: { id_docente: 1, nombre: 'Matemáticas', descripcion: 'Curso básico' },
      } as Request;
      const res = mockRes();

      await crearCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    test('debe rechazar si falta nombre', async () => {
      const req = { body: { id_docente: 1 } } as Request;
      const res = mockRes();

      await crearCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('debe manejar FK inválida (23503)', async () => {
      query.mockRejectedValueOnce({ code: '23503' });

      const req = {
        body: { id_docente: 999, nombre: 'Curso' },
      } as Request;
      const res = mockRes();

      await crearCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('listarCursos', () => {
    test('debe retornar cursos paginados', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ total: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id_curso: 1, nombre: 'Curso 1', docente_nombre: 'Profesor' }],
          rowCount: 1,
        });

      const req = { query: { page: '1', limit: '20' } } as unknown as Request;
      const res = mockRes();

      await listarCursos(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 5,
          page: 1,
        })
      );
    });
  });

  describe('listarEstudiantesDisponibles', () => {
    test('debe listar estudiantes no matriculados con ownership válido', async () => {
      const estudiantes = [
        { id_usuario: 2, nombre_completo: 'Ana López', cedula: 'V12345', email: 'ana@test.com' },
        { id_usuario: 3, nombre_completo: 'Carlos Ruiz', cedula: 'V67890', email: 'carlos@test.com' },
      ];
      query
        .mockResolvedValueOnce({ rows: [{ id_docente: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: estudiantes, rowCount: 2 });

      const req = {
        params: { id: '1' },
        user: { id_usuario: 1, rol: 'docente' },
      } as unknown as Request;
      const res = mockRes();

      await listarEstudiantesDisponibles(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: estudiantes })
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(u.rol) = 'estudiante'"),
        [1]
      );
    });

    test('debe rechazar sin ownership', async () => {
      query.mockResolvedValueOnce({ rows: [{ id_docente: 99 }], rowCount: 1 });

      const req = {
        params: { id: '1' },
        user: { id_usuario: 1, rol: 'docente' },
      } as unknown as Request;
      const res = mockRes();

      await listarEstudiantesDisponibles(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    test('debe rechazar ID inválido', async () => {
      const req = {
        params: { id: 'abc' },
        user: { id_usuario: 1, rol: 'admin' },
      } as unknown as Request;
      const res = mockRes();

      await listarEstudiantesDisponibles(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

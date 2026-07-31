/**
 * Pruebas unitarias: asistenciaController
 */
import { Request, Response } from 'express';
import {
  crearSesionAsistencia,
  obtenerSesionHoy,
  obtenerSesion,
  registrarAsistencia,
  cerrarSesionAsistencia,
} from '../controllers/asistenciaController';

jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../utils/authorization', () => ({
  verificarOwnershipClase: jest.fn(),
}));

const { query } = require('../db');
const { verificarOwnershipClase } = require('../utils/authorization');

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

describe('asistenciaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearSesionAsistencia', () => {
    test('debe crear una nueva sesión de asistencia', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      query.mockResolvedValueOnce({
        rows: [{
          id_sesion: 1,
          id_clase: 1,
          id_docente: 1,
          fecha: '2026-07-30',
          estado: 'abierta',
        }],
        rowCount: 1,
      });

      const req = mockReq({}, { id_clase: 1, fecha: '2026-07-30' });
      const res = mockRes();

      await crearSesionAsistencia(req, res);

      expect(verificarOwnershipClase).toHaveBeenCalledWith(1, req.user);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    test('debe devolver la sesión existente si ya hay una para la clase/fecha', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query.mockResolvedValueOnce({
        rows: [{
          id_sesion: 2,
          id_clase: 1,
          id_docente: 1,
          fecha: '2026-07-30',
          estado: 'abierta',
        }],
        rowCount: 1,
      });

      const req = mockReq({}, { id_clase: 1, fecha: '2026-07-30' });
      const res = mockRes();

      await crearSesionAsistencia(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
      expect(query).toHaveBeenCalledTimes(1);
    });

    test('debe rechazar id_clase inválido', async () => {
      const req = mockReq({}, { id_clase: 'abc' });
      const res = mockRes();

      await crearSesionAsistencia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('debe rechazar sin ownership', async () => {
      verificarOwnershipClase.mockResolvedValue(false);

      const req = mockReq({}, { id_clase: 1 });
      const res = mockRes();

      await crearSesionAsistencia(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('obtenerSesionHoy', () => {
    test('debe obtener la sesión de hoy', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query.mockResolvedValueOnce({
        rows: [{
          id_sesion: 1,
          id_clase: 1,
          fecha: '2026-07-30',
          estado: 'abierta',
        }],
        rowCount: 1,
      });

      const req = mockReq({ id_clase: '1' });
      const res = mockRes();

      await obtenerSesionHoy(req, res);

      expect(verificarOwnershipClase).toHaveBeenCalledWith(1, req.user);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    test('debe devolver null si no hay sesión de hoy', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = mockReq({ id_clase: '1' });
      const res = mockRes();

      await obtenerSesionHoy(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    });
  });

  describe('obtenerSesion', () => {
    test('debe devolver sesión con asistencias', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query
        .mockResolvedValueOnce({
          rows: [{
            id_sesion: 1,
            id_clase: 1,
            id_curso: 10,
            estado: 'abierta',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{
            id_asistencia: 1,
            id_estudiante: 5,
            estado: 'presente',
            fecha_registro: '2026-07-30',
            nombre_completo: 'Ana Pérez',
            cedula: '12345678',
          }],
          rowCount: 1,
        });

      const req = mockReq({ id_sesion: '1' });
      const res = mockRes();

      await obtenerSesion(req, res);

      expect(verificarOwnershipClase).toHaveBeenCalledWith(1, req.user);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sesion: expect.any(Object),
            asistencias: expect.any(Array),
          }),
        })
      );
    });

    test('debe retornar 404 si no existe la sesión', async () => {
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = mockReq({ id_sesion: '99' });
      const res = mockRes();

      await obtenerSesion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('registrarAsistencia', () => {
    test('debe registrar asistencia en sesión abierta', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query
        .mockResolvedValueOnce({
          rows: [{
            id_sesion: 1,
            id_clase: 1,
            id_curso: 10,
            estado: 'abierta',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id_asistencia: 1,
            id_sesion: 1,
            id_clase: 1,
            id_estudiante: 5,
            estado: 'presente',
            fecha_registro: '2026-07-30',
          }],
          rowCount: 1,
        });

      const req = mockReq({ id_sesion: '1' }, { id_estudiante: 5, estado: 'presente' });
      const res = mockRes();

      await registrarAsistencia(req, res);

      expect(verificarOwnershipClase).toHaveBeenCalledWith(1, req.user);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO asistencias_alumnos'),
        expect.arrayContaining([1, 1, 5, 'presente'])
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    test('debe rechazar asistencia en sesión cerrada', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id_sesion: 1,
          id_clase: 1,
          id_curso: 10,
          estado: 'cerrada',
        }],
        rowCount: 1,
      });

      const req = mockReq({ id_sesion: '1' }, { id_estudiante: 5, estado: 'presente' });
      const res = mockRes();

      await registrarAsistencia(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('cerrada') })
      );
    });

    test('debe rechazar estado inválido', async () => {
      const req = mockReq({ id_sesion: '1' }, { id_estudiante: 5, estado: 'tarde' });
      const res = mockRes();

      await registrarAsistencia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cerrarSesionAsistencia', () => {
    test('debe cerrar sesión y contabilizar totales', async () => {
      verificarOwnershipClase.mockResolvedValue(true);
      query
        .mockResolvedValueOnce({
          rows: [{
            id_sesion: 1,
            id_clase: 1,
            id_curso: 10,
            estado: 'abierta',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ presentes: '8', ausentes: '2', justificados: '0' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{
            id_sesion: 1,
            id_clase: 1,
            estado: 'cerrada',
            total_presentes: 8,
            total_ausentes: 2,
            total_justificados: 0,
          }],
          rowCount: 1,
        });

      const req = mockReq({ id_sesion: '1' });
      const res = mockRes();

      await cerrarSesionAsistencia(req, res);

      expect(verificarOwnershipClase).toHaveBeenCalledWith(1, req.user);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sesion: expect.any(Object),
            totales: expect.objectContaining({ presentes: 8, ausentes: 2, justificados: 0 }),
          }),
        })
      );
    });

    test('debe rechazar cerrar una sesión ya cerrada', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id_sesion: 1,
          id_clase: 1,
          id_curso: 10,
          estado: 'cerrada',
        }],
        rowCount: 1,
      });

      const req = mockReq({ id_sesion: '1' });
      const res = mockRes();

      await cerrarSesionAsistencia(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });
});

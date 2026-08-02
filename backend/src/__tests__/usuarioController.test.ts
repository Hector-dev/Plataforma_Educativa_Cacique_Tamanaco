/**
 * Pruebas unitarias: usuarioController
 * Usa mocks de pg (db.ts) y bcrypt para no depender de BD real.
 */
import { Request, Response } from 'express';
import { crearUsuario, listarUsuarios } from '../controllers/usuarioController';

// Mock de db.ts
jest.mock('../db', () => ({
  query: jest.fn(),
}));

// Mock de bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

// Mock de logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { query } = require('../db');

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('usuarioController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearUsuario', () => {
    test('debe crear usuario con datos válidos (zod)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id_usuario: 1, nombre_completo: 'Test User', email: 'test@test.com', rol: 'Estudiante' }],
        rowCount: 1,
      });

      const req = {
        body: {
          nombre_completo: 'Test User',
          cedula: 'V-12345',
          email: 'test@test.com',
          password: 'Secret123',
          rol: 'Estudiante',
        },
      } as Request;
      const res = mockRes();

      await crearUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('debe rechazar si falta nombre_completo (zod)', async () => {
      const req = {
        body: { email: 'test@test.com', password: 'Secret123', rol: 'Estudiante', cedula: 'V-1' },
      } as Request;
      const res = mockRes();

      await crearUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    test('debe manejar email duplicado (código 23505)', async () => {
      query.mockRejectedValueOnce({ code: '23505', detail: 'Key (email)=(test@test.com) already exists' });

      const req = {
        body: {
          nombre_completo: 'Test',
          cedula: 'V-1',
          email: 'test@test.com',
          password: 'Secret123',
          rol: 'Estudiante',
        },
      } as Request;
      const res = mockRes();

      await crearUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('listarUsuarios', () => {
    test('debe retornar usuarios paginados', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ total: 3 }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({
          rows: [
            { id_usuario: 1, nombre_completo: 'Admin', email: 'admin@admin.com' },
            { id_usuario: 2, nombre_completo: 'User', email: 'user@test.com' },
          ],
          rowCount: 2,
        });

      const req = { query: { page: '1', limit: '50' } } as unknown as Request;
      const res = mockRes();

      await listarUsuarios(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 3,
          page: 1,
        })
      );
    });
  });
});

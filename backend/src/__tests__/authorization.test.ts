/**
 * Pruebas unitarias: utilidades de autorización y middlewares.
 */
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import {
    adminOPropioUsuario,
    adminOPropioUsuarioBody,
    esAdmin,
    esDocente,
    esEstudiante,
    verificarOwnershipCurso,
    verificarOwnershipBatchClases,
    verificarOwnershipBatchEvaluaciones,
} from '../utils/authorization';

// Mock de db.ts
jest.mock('../db', () => ({
    query: jest.fn(),
}));

const { query } = require('../db');

function mockRes() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

function mockReq(user?: any, params?: any, body?: any): Request {
    return {
        user,
        params: params || {},
        body: body || {},
    } as unknown as Request;
}

const mockNext: NextFunction = jest.fn();

describe('authorization utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('esAdmin / esDocente / esEstudiante', () => {
        test('normaliza "administrador" como admin', () => {
            expect(esAdmin('administrador')).toBe(true);
            expect(esAdmin('admin')).toBe(true);
            expect(esAdmin('docente')).toBe(false);
        });

        test('detecta docente y estudiante', () => {
            expect(esDocente('docente')).toBe(true);
            expect(esEstudiante('estudiante')).toBe(true);
        });
    });

    describe('requireRole', () => {
        test('permite acceso si el rol coincide', () => {
            const req = mockReq({ id_usuario: 1, rol: 'admin' });
            const res = mockRes();
            const middleware = requireRole('admin');
            middleware(req, res, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('permite acceso con "administrador" mapeado a admin', () => {
            const req = mockReq({ id_usuario: 1, rol: 'Administrador' });
            const res = mockRes();
            const middleware = requireRole('admin');
            middleware(req, res, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('deniega acceso si el rol no coincide', () => {
            const req = mockReq({ id_usuario: 1, rol: 'estudiante' });
            const res = mockRes();
            const middleware = requireRole('admin');
            middleware(req, res, mockNext);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('deniega acceso si no hay usuario', () => {
            const req = mockReq();
            const res = mockRes();
            const middleware = requireRole('admin');
            middleware(req, res, mockNext);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('adminOPropioUsuario', () => {
        test('permite admin sobre cualquier usuario', () => {
            const req = mockReq({ id_usuario: 1, rol: 'admin' }, { id: '99' });
            const res = mockRes();
            adminOPropioUsuario(req, res, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('permite usuario sobre su propio perfil', () => {
            const req = mockReq({ id_usuario: 5, rol: 'estudiante' }, { id: '5' });
            const res = mockRes();
            adminOPropioUsuario(req, res, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('deniega usuario sobre otro perfil', () => {
            const req = mockReq({ id_usuario: 5, rol: 'estudiante' }, { id: '6' });
            const res = mockRes();
            adminOPropioUsuario(req, res, mockNext);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('adminOPropioUsuarioBody', () => {
        test('permite usuario sobre su propio documento', () => {
            const req = mockReq({ id_usuario: 5, rol: 'estudiante' }, {}, { id_usuario: 5 });
            const res = mockRes();
            adminOPropioUsuarioBody(req, res, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        test('deniega usuario sobre documento de otro', () => {
            const req = mockReq({ id_usuario: 5, rol: 'estudiante' }, {}, { id_usuario: 6 });
            const res = mockRes();
            adminOPropioUsuarioBody(req, res, mockNext);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('verificarOwnershipCurso', () => {
        test('admin siempre tiene ownership', async () => {
            const reqUser = { id_usuario: 1, rol: 'administrador', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipCurso(10, reqUser);
            expect(result).toBe(true);
            expect(query).not.toHaveBeenCalled();
        });

        test('estudiante nunca tiene ownership', async () => {
            const reqUser = { id_usuario: 5, rol: 'estudiante', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipCurso(10, reqUser);
            expect(result).toBe(false);
            expect(query).not.toHaveBeenCalled();
        });

        test('docente dueño del curso tiene ownership', async () => {
            query.mockResolvedValueOnce({ rows: [{ id_docente: 5 }], rowCount: 1 });
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipCurso(10, reqUser);
            expect(result).toBe(true);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id_docente FROM cursos'),
                [10]
            );
        });

        test('docente no dueño del curso es denegado', async () => {
            query.mockResolvedValueOnce({ rows: [{ id_docente: 7 }], rowCount: 1 });
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipCurso(10, reqUser);
            expect(result).toBe(false);
        });
    });

    describe('verificarOwnershipBatchClases', () => {
        test('admin siempre autoriza batches', async () => {
            const reqUser = { id_usuario: 1, rol: 'admin', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipBatchClases([1, 2, 3], reqUser);
            expect(result).toBe(true);
            expect(query).not.toHaveBeenCalled();
        });

        test('docente dueño autoriza batch de sus clases', async () => {
            query
                .mockResolvedValueOnce({ rows: [{ docentes_distintos: 1, clases_encontradas: 2 }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [{ id_docente: 5 }], rowCount: 1 });
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipBatchClases([1, 2], reqUser);
            expect(result).toBe(true);
        });

        test('docente no autoriza batch con clases ajenas', async () => {
            query
                .mockResolvedValueOnce({ rows: [{ docentes_distintos: 2, clases_encontradas: 2 }], rowCount: 1 });
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipBatchClases([1, 2], reqUser);
            expect(result).toBe(false);
        });

        test('batch vacío se autoriza automáticamente', async () => {
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipBatchClases([], reqUser);
            expect(result).toBe(true);
            expect(query).not.toHaveBeenCalled();
        });
    });

    describe('verificarOwnershipBatchEvaluaciones', () => {
        test('docente dueño autoriza batch de sus evaluaciones', async () => {
            query
                .mockResolvedValueOnce({ rows: [{ docentes_distintos: 1, evaluaciones_encontradas: 2 }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [{ id_docente: 5 }], rowCount: 1 });
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipBatchEvaluaciones([10, 20], reqUser);
            expect(result).toBe(true);
        });

        test('docente no autoriza evaluaciones de otro docente', async () => {
            query
                .mockResolvedValueOnce({ rows: [{ docentes_distintos: 1, evaluaciones_encontradas: 2 }], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [{ id_docente: 7 }], rowCount: 1 });
            const reqUser = { id_usuario: 5, rol: 'docente', email: 'a', nombre_completo: 'a', cedula: 'a' };
            const result = await verificarOwnershipBatchEvaluaciones([10, 20], reqUser);
            expect(result).toBe(false);
        });
    });

    describe('validación estricta de IDs en middlewares', () => {
        test('adminOPropioUsuario rechaza ID con letras', () => {
            const req = mockReq({ id_usuario: 1, rol: 'admin' }, { id: '5abc' });
            const res = mockRes();
            adminOPropioUsuario(req, res, mockNext);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('adminOPropioUsuarioBody rechaza id_usuario con letras', () => {
            const req = mockReq({ id_usuario: 1, rol: 'admin' }, {}, { id_usuario: '5abc' });
            const res = mockRes();
            adminOPropioUsuarioBody(req, res, mockNext);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});

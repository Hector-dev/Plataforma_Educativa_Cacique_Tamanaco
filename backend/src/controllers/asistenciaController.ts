import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';
import { verificarOwnershipClase } from '../utils/authorization';

// ============================================================
// Helpers
// ============================================================
const esIdEnteroPositivo = (valor: unknown): number | null => {
    if (typeof valor !== 'string' && typeof valor !== 'number') return null;
    const str = String(valor).trim();
    if (!/^\d+$/.test(str)) return null;
    const num = parseInt(str, 10);
    return Number.isFinite(num) && num > 0 ? num : null;
};

const normalizarFecha = (fecha?: string): string => {
    if (!fecha || fecha.trim() === '') return new Date().toISOString().split('T')[0];
    return fecha;
};

// ============================================================
// Crear sesión de asistencia
// POST /api/asistencia/sesiones
// ============================================================
export const crearSesionAsistencia = async (req: Request, res: Response): Promise<void> => {
    try {
        const idClase = esIdEnteroPositivo(req.body.id_clase);
        if (idClase === null) {
            res.status(400).json({ success: false, message: 'id_clase inválido' });
            return;
        }

        if (!req.user || !(await verificarOwnershipClase(idClase, req.user))) {
            res.status(403).json({ success: false, message: 'No tiene permiso para gestionar asistencias de esta clase' });
            return;
        }

        const fecha = normalizarFecha(req.body.fecha);

        // Si ya existe, devolverla
        const existente = await query(
            `SELECT * FROM sesiones_asistencia WHERE id_clase = $1 AND fecha = $2`,
            [idClase, fecha]
        );
        if (existente.rows.length > 0) {
            res.json({ success: true, data: existente.rows[0] });
            return;
        }

        // Crear nueva sesión
        const idDocente = req.user.id_usuario;
        const result = await query(
            `INSERT INTO sesiones_asistencia (id_clase, id_docente, fecha, estado)
             VALUES ($1, $2, $3, 'abierta')
             RETURNING *`,
            [idClase, idDocente, fecha]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al crear sesión de asistencia:');
        res.status(500).json({ success: false, message: 'Error al crear sesión de asistencia' });
    }
};

// ============================================================
// Obtener sesión de hoy
// GET /api/asistencia/sesiones/:id_clase/hoy
// ============================================================
export const obtenerSesionHoy = async (req: Request, res: Response): Promise<void> => {
    try {
        const idClase = esIdEnteroPositivo(req.params.id_clase);
        if (idClase === null) {
            res.status(400).json({ success: false, message: 'id_clase inválido' });
            return;
        }

        if (!req.user || !(await verificarOwnershipClase(idClase, req.user))) {
            res.status(403).json({ success: false, message: 'No tiene permiso para gestionar asistencias de esta clase' });
            return;
        }

        const result = await query(
            `SELECT * FROM sesiones_asistencia WHERE id_clase = $1 AND fecha = CURRENT_DATE`,
            [idClase]
        );

        res.json({ success: true, data: result.rows[0] || null });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al obtener sesión de hoy:');
        res.status(500).json({ success: false, message: 'Error al obtener sesión de hoy' });
    }
};

// ============================================================
// Obtener sesión con sus asistencias
// GET /api/asistencia/sesiones/:id_sesion
// ============================================================
export const obtenerSesion = async (req: Request, res: Response): Promise<void> => {
    try {
        const idSesion = esIdEnteroPositivo(req.params.id_sesion);
        if (idSesion === null) {
            res.status(400).json({ success: false, message: 'id_sesion inválido' });
            return;
        }

        const sesionResult = await query(
            `SELECT s.*, cl.id_curso
             FROM sesiones_asistencia s
             JOIN clases cl ON cl.id_clase = s.id_clase
             WHERE s.id_sesion = $1`,
            [idSesion]
        );

        if (sesionResult.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Sesión no encontrada' });
            return;
        }

        const idClase = Number(sesionResult.rows[0].id_clase);
        if (!req.user || !(await verificarOwnershipClase(idClase, req.user))) {
            res.status(403).json({ success: false, message: 'No tiene permiso para ver esta sesión' });
            return;
        }

        const asistencias = await query(
            `SELECT aa.id_asistencia, aa.id_estudiante, aa.estado, aa.fecha_registro,
                    u.nombre_completo, u.cedula
             FROM asistencias_alumnos aa
             JOIN usuarios u ON u.id_usuario = aa.id_estudiante
             WHERE aa.id_sesion = $1
             ORDER BY u.nombre_completo`,
            [idSesion]
        );

        res.json({
            success: true,
            data: {
                sesion: sesionResult.rows[0],
                asistencias: asistencias.rows,
            },
        });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al obtener sesión:');
        res.status(500).json({ success: false, message: 'Error al obtener sesión' });
    }
};

// ============================================================
// Registrar asistencia en sesión
// POST /api/asistencia/sesiones/:id_sesion/asistencias
// ============================================================
export const registrarAsistencia = async (req: Request, res: Response): Promise<void> => {
    try {
        const idSesion = esIdEnteroPositivo(req.params.id_sesion);
        if (idSesion === null) {
            res.status(400).json({ success: false, message: 'id_sesion inválido' });
            return;
        }

        const idEstudiante = esIdEnteroPositivo(req.body.id_estudiante);
        if (idEstudiante === null) {
            res.status(400).json({ success: false, message: 'id_estudiante inválido' });
            return;
        }

        const estado = req.body.estado;
        if (!['presente', 'ausente', 'justificado'].includes(estado)) {
            res.status(400).json({ success: false, message: 'estado inválido' });
            return;
        }

        // Verificar sesión y estado
        const sesionResult = await query(
            `SELECT s.*, cl.id_curso
             FROM sesiones_asistencia s
             JOIN clases cl ON cl.id_clase = s.id_clase
             WHERE s.id_sesion = $1`,
            [idSesion]
        );

        if (sesionResult.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Sesión no encontrada' });
            return;
        }

        const sesion = sesionResult.rows[0];
        if (sesion.estado !== 'abierta') {
            res.status(409).json({ success: false, message: 'La sesión de asistencia está cerrada' });
            return;
        }

        const idClase = Number(sesion.id_clase);
        if (!req.user || !(await verificarOwnershipClase(idClase, req.user))) {
            res.status(403).json({ success: false, message: 'No tiene permiso para registrar asistencias en esta sesión' });
            return;
        }

        // Verificar que el estudiante esté matriculado en el curso
        const matriculado = await query(
            `SELECT 1 FROM matriculas m
             JOIN clases cl ON cl.id_curso = m.id_curso
             WHERE cl.id_clase = $1 AND m.id_estudiante = $2 AND m.estado = 'activo'
             LIMIT 1`,
            [idClase, idEstudiante]
        );
        if (matriculado.rows.length === 0) {
            res.status(400).json({ success: false, message: 'El estudiante no está matriculado en esta clase' });
            return;
        }

        const result = await query(
            `INSERT INTO asistencias_alumnos (id_sesion, id_clase, id_estudiante, estado, fecha_registro)
             VALUES ($1, $2, $3, $4, CURRENT_DATE)
             ON CONFLICT (id_sesion, id_estudiante)
             DO UPDATE SET estado = EXCLUDED.estado, fecha_registro = CURRENT_DATE
             RETURNING *`,
            [idSesion, idClase, idEstudiante, estado]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al registrar asistencia:');
        res.status(500).json({ success: false, message: 'Error al registrar asistencia' });
    }
};

// ============================================================
// Cerrar sesión y contabilizar
// POST /api/asistencia/sesiones/:id_sesion/cerrar
// ============================================================
export const cerrarSesionAsistencia = async (req: Request, res: Response): Promise<void> => {
    try {
        const idSesion = esIdEnteroPositivo(req.params.id_sesion);
        if (idSesion === null) {
            res.status(400).json({ success: false, message: 'id_sesion inválido' });
            return;
        }

        const sesionResult = await query(
            `SELECT s.*, cl.id_curso
             FROM sesiones_asistencia s
             JOIN clases cl ON cl.id_clase = s.id_clase
             WHERE s.id_sesion = $1`,
            [idSesion]
        );

        if (sesionResult.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Sesión no encontrada' });
            return;
        }

        const sesion = sesionResult.rows[0];
        if (sesion.estado !== 'abierta') {
            res.status(409).json({ success: false, message: 'La sesión de asistencia ya está cerrada' });
            return;
        }

        const idClase = Number(sesion.id_clase);
        if (!req.user || !(await verificarOwnershipClase(idClase, req.user))) {
            res.status(403).json({ success: false, message: 'No tiene permiso para cerrar esta sesión' });
            return;
        }

        // Contar totales
        const totales = await query(
            `SELECT
                COUNT(*) FILTER (WHERE estado = 'presente') AS presentes,
                COUNT(*) FILTER (WHERE estado = 'ausente') AS ausentes,
                COUNT(*) FILTER (WHERE estado = 'justificado') AS justificados
             FROM asistencias_alumnos
             WHERE id_sesion = $1`,
            [idSesion]
        );

        const { presentes, ausentes, justificados } = totales.rows[0];

        const cerrada = await query(
            `UPDATE sesiones_asistencia
             SET estado = 'cerrada',
                 cerrado_en = NOW(),
                 total_presentes = $1,
                 total_ausentes = $2,
                 total_justificados = $3
             WHERE id_sesion = $4
             RETURNING *`,
            [Number(presentes), Number(ausentes), Number(justificados), idSesion]
        );

        res.json({
            success: true,
            data: {
                sesion: cerrada.rows[0],
                totales: {
                    presentes: Number(presentes),
                    ausentes: Number(ausentes),
                    justificados: Number(justificados),
                },
            },
        });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al cerrar sesión de asistencia:');
        res.status(500).json({ success: false, message: 'Error al cerrar sesión de asistencia' });
    }
};

// ============================================================
// Obtener resumen semanal de asistencias
// GET /api/asistencia/semanal
// ============================================================
export const obtenerResumenSemanal = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT
                COALESCE(EXTRACT(DOW FROM fecha_registro), 0)::int AS dia_semana,
                COUNT(*) AS total
            FROM asistencias_alumnos
            WHERE estado = 'presente'
              AND fecha_registro IS NOT NULL
              AND fecha_registro >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY EXTRACT(DOW FROM fecha_registro)
            ORDER BY dia_semana
        `);

        const diasMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
        const semana = [0, 0, 0, 0, 0];

        for (const row of result.rows) {
            const idx = diasMap[row.dia_semana];
            if (idx !== undefined) {
                semana[idx] = parseInt(row.total, 10);
            }
        }

        res.json({ success: true, data: semana });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al obtener resumen semanal:');
        res.status(500).json({ success: false, message: 'Error al obtener resumen de asistencias' });
    }
};

// ============================================================
// Obtener asistencia personal del estudiante autenticado
// GET /api/asistencia/mi-asistencia
// ============================================================
export const obtenerMiAsistencia = async (req: Request, res: Response): Promise<void> => {
    try {
        const idEstudiante = req.user!.id_usuario;
        const result = await query(`
            SELECT
                COALESCE(EXTRACT(DOW FROM fecha_registro), 0)::int AS dia_semana,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado = 'presente') AS presentes
            FROM asistencias_alumnos
            WHERE id_estudiante = $1
              AND fecha_registro >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY EXTRACT(DOW FROM fecha_registro)
            ORDER BY dia_semana
        `, [idEstudiante]);

        const diasMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
        const semana = [0, 0, 0, 0, 0];
        const totalSemana = [0, 0, 0, 0, 0];

        for (const row of result.rows) {
            const idx = diasMap[row.dia_semana];
            if (idx !== undefined) {
                semana[idx] = parseInt(row.presentes, 10);
                totalSemana[idx] = parseInt(row.total, 10);
            }
        }

        const totalAsistencias = semana.reduce((a, b) => a + b, 0);
        const totalClases = totalSemana.reduce((a, b) => a + b, 0);

        res.json({
            success: true,
            data: {
                semanal: semana,
                totalAsistencias,
                totalClases,
                porcentaje: totalClases > 0 ? Math.round((totalAsistencias / totalClases) * 100) : 0,
            }
        });
    } catch (error) {
        logger.error({ err: error }, '[asistenciaController] Error al obtener mi asistencia:');
        res.status(500).json({ success: false, message: 'Error al obtener asistencia personal' });
    }
};

import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';
import { verificarOwnershipEvaluacion } from '../utils/authorization';
import { guardarCalificacionSchema } from '../utils/validators';

// ============================================================
// Calificaciones Controller — Gestión de notas por evaluación
// ============================================================

/**
 * GET /api/evaluaciones/:id/calificaciones
 * Lista todos los estudiantes matriculados en el curso de la evaluación
 * con su calificación actual (si existe) y su entrega (si existe).
 */
export const listarCalificacionesPorEvaluacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_evaluacion = parseInt(req.params.id, 10);
        if (isNaN(id_evaluacion)) {
            res.status(400).json({ success: false, message: 'ID de evaluación inválido' });
            return;
        }

        // Verificar ownership del curso/evaluación
        if (!req.user || !(await verificarOwnershipEvaluacion(id_evaluacion, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para ver las calificaciones de esta evaluación',
            });
            return;
        }

        const result = await query(
            `SELECT
                u.id_usuario AS id_estudiante,
                u.nombre_completo,
                u.cedula,
                c.nota_preliminar,
                c.nota_definitiva,
                c.observaciones,
                e.id_entrega,
                e.formato_entrega,
                e.contenido,
                e.fecha_entrega
             FROM evaluaciones ev
             JOIN clases cl ON cl.id_clase = ev.id_clase
             JOIN cursos cu ON cu.id_curso = cl.id_curso
             JOIN matriculas m ON m.id_curso = cu.id_curso AND m.estado = 'activo'
             JOIN usuarios u ON u.id_usuario = m.id_estudiante
             LEFT JOIN calificaciones c
                 ON c.id_evaluacion = ev.id_evaluacion AND c.id_estudiante = u.id_usuario
             LEFT JOIN entregas_evaluacion e
                 ON e.id_evaluacion = ev.id_evaluacion AND e.id_estudiante = u.id_usuario
             WHERE ev.id_evaluacion = $1
             ORDER BY u.nombre_completo`,
            [id_evaluacion]
        );

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        logger.error({ err: error }, '[CalificacionController] Error al guardar calificación:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/evaluaciones/mis-notas
// Notas del estudiante autenticado agrupadas por curso.
// ============================================================
export const obtenerMisNotas = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.rol?.toLowerCase() !== 'estudiante') {
            res.status(403).json({ success: false, message: 'Solo estudiantes pueden consultar sus notas' });
            return;
        }

        const id_estudiante = req.user.id_usuario;
        const result = await query(
            `SELECT
                cu.id_curso,
                cu.nombre AS curso,
                cl.id_clase,
                cl.titulo AS clase,
                ev.id_evaluacion,
                ev.titulo_evaluacion AS evaluacion,
                CASE WHEN q.id_quiz IS NOT NULL THEN 'quiz' ELSE 'evaluacion' END AS tipo_evaluacion,
                ev.porcentaje,
                c.nota_preliminar,
                c.nota_definitiva,
                c.observaciones,
                qi.nota AS quiz_nota,
                qi.acertadas,
                qi.total_preguntas
             FROM matriculas m
             JOIN cursos cu ON cu.id_curso = m.id_curso
             JOIN clases cl ON cl.id_curso = cu.id_curso
             JOIN evaluaciones ev ON ev.id_clase = cl.id_clase
             LEFT JOIN calificaciones c
                 ON c.id_evaluacion = ev.id_evaluacion AND c.id_estudiante = m.id_estudiante
             LEFT JOIN quizzes q ON q.id_evaluacion = ev.id_evaluacion
             LEFT JOIN quiz_intentos qi
                 ON qi.id_quiz = q.id_quiz AND qi.id_estudiante = m.id_estudiante AND qi.finalizado = true
             WHERE m.id_estudiante = $1 AND m.estado = 'activo'
             ORDER BY cu.nombre, cl.orden, ev.id_evaluacion`,
            [id_estudiante]
        );

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        logger.error({ err: error }, '[CalificacionController] Error al obtener mis notas:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

/**
 * POST /api/evaluaciones/:id/calificaciones
 * Guarda o actualiza la calificación de un estudiante en una evaluación.
 */
export const guardarCalificacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_evaluacion = parseInt(req.params.id, 10);
        if (isNaN(id_evaluacion)) {
            res.status(400).json({ success: false, message: 'ID de evaluación inválido' });
            return;
        }

        // Verificar ownership del curso/evaluación
        if (!req.user || !(await verificarOwnershipEvaluacion(id_evaluacion, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para registrar calificaciones en esta evaluación',
            });
            return;
        }

        const parsed = guardarCalificacionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos',
                errors: parsed.error.flatten(),
            });
            return;
        }

        const { id_estudiante, nota_preliminar, nota_definitiva, observaciones } = parsed.data;

        // Validación explícita de rangos (defensa en profundidad más allá de Zod)
        const validarNota = (nota: number | null | undefined): boolean => {
            if (nota === undefined || nota === null) return true;
            return nota >= 0 && nota <= 20;
        };

        if (!validarNota(nota_preliminar) || !validarNota(nota_definitiva)) {
            res.status(400).json({
                success: false,
                message: 'Las notas deben estar entre 0 y 20',
            });
            return;
        }

        // Validar que el estudiante esté matriculado activamente en el curso de la evaluación
        const matriculaResult = await query(
            `SELECT 1
             FROM evaluaciones ev
             JOIN clases cl ON cl.id_clase = ev.id_clase
             JOIN cursos cu ON cu.id_curso = cl.id_curso
             JOIN matriculas m ON m.id_curso = cu.id_curso AND m.estado = 'activo'
             WHERE ev.id_evaluacion = $1
               AND m.id_estudiante = $2
             LIMIT 1`,
            [id_evaluacion, id_estudiante]
        );

        if (matriculaResult.rowCount === 0) {
            res.status(400).json({
                success: false,
                message: 'El estudiante no está matriculado en el curso de esta evaluación',
            });
            return;
        }

        const result = await query(
            `INSERT INTO calificaciones
                (id_evaluacion, id_estudiante, nota_preliminar, nota_definitiva, observaciones, fecha_registro)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id_evaluacion, id_estudiante)
             DO UPDATE SET
                nota_preliminar = EXCLUDED.nota_preliminar,
                nota_definitiva = EXCLUDED.nota_definitiva,
                observaciones = EXCLUDED.observaciones,
                fecha_registro = NOW()
             RETURNING *`,
            [id_evaluacion, id_estudiante, nota_preliminar ?? null, nota_definitiva ?? null, observaciones ?? null]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23503') {
            const detail = error.detail || '';
            if (detail.includes('id_evaluacion')) {
                res.status(400).json({ success: false, message: 'La evaluación especificada no existe' });
            } else if (detail.includes('id_estudiante')) {
                res.status(400).json({ success: false, message: 'El estudiante especificado no existe' });
            } else {
                res.status(400).json({ success: false, message: 'Violación de clave foránea', detail });
            }
            return;
        }

        logger.error({ err: error }, '[CalificacionController] Error al guardar calificación:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

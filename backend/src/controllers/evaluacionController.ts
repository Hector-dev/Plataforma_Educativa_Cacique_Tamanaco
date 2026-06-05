import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';

// GET /api/evaluaciones/clase/:id_clase - Listar evaluaciones por clase
export const listarEvaluacionesPorClase = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_clase } = req.params;
        const esEstudiante = req.user && req.user.rol?.toLowerCase() === 'estudiante';
        const result = await query(
            `SELECT e.*, c.titulo AS clase_titulo,
                    EXISTS(SELECT 1 FROM quizzes WHERE id_evaluacion = e.id_evaluacion) AS tiene_quiz
                    ${esEstudiante ? `, (SELECT qi.nota FROM quiz_intentos qi
                       JOIN quizzes qz ON qz.id_quiz = qi.id_quiz
                       WHERE qz.id_evaluacion = e.id_evaluacion
                         AND qi.id_estudiante = $2
                         AND qi.finalizado = true
                       LIMIT 1) AS quiz_nota` : ''}
             FROM evaluaciones e
             JOIN clases c ON c.id_clase = e.id_clase
             WHERE e.id_clase = $1
             ORDER BY e.id_evaluacion`,
            esEstudiante ? [id_clase, req.user!.id_usuario] : [id_clase]
        );
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        logger.error({ err: error }, '[EvaluacionController] Error al listar evaluaciones:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/evaluaciones/curso/:id_curso - Listar todas las evaluaciones de un curso (a través de sus clases)
export const listarEvaluacionesPorCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_curso } = req.params;
        const esEstudiante = req.user && req.user.rol?.toLowerCase() === 'estudiante';
        const result = await query(
            `SELECT e.*, c.titulo AS clase_titulo, c.id_curso,
                    EXISTS(SELECT 1 FROM quizzes WHERE id_evaluacion = e.id_evaluacion) AS tiene_quiz
                    ${esEstudiante ? `, (SELECT qi.nota FROM quiz_intentos qi
                       JOIN quizzes qz ON qz.id_quiz = qi.id_quiz
                       WHERE qz.id_evaluacion = e.id_evaluacion
                         AND qi.id_estudiante = $2
                         AND qi.finalizado = true
                       LIMIT 1) AS quiz_nota` : ''}
             FROM evaluaciones e
             JOIN clases c ON c.id_clase = e.id_clase
             WHERE c.id_curso = $1
             ORDER BY c.id_clase, e.id_evaluacion`,
            esEstudiante ? [id_curso, req.user!.id_usuario] : [id_curso]
        );
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        logger.error({ err: error }, '[EvaluacionController] Error al listar evaluaciones por curso:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/evaluaciones/:id - Obtener una evaluación
export const obtenerEvaluacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT e.*, c.titulo AS clase_titulo
             FROM evaluaciones e
             JOIN clases c ON c.id_clase = e.id_clase
             WHERE e.id_evaluacion = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error({ err: error }, '[EvaluacionController] Error al obtener evaluación:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/evaluaciones - Crear evaluación
export const crearEvaluacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_clase, titulo_evaluacion, porcentaje } = req.body;

        if (!id_clase || !titulo_evaluacion || porcentaje === undefined) {
            res.status(400).json({
                success: false,
                message: 'Los campos id_clase, titulo_evaluacion y porcentaje son obligatorios',
            });
            return;
        }

        const result = await query(
            `INSERT INTO evaluaciones (id_clase, titulo_evaluacion, porcentaje)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id_clase, titulo_evaluacion, porcentaje]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error({ err: error }, '[EvaluacionController] Error al crear evaluación:');
        if (error.code === '23503') {
            res.status(400).json({ success: false, message: 'La clase especificada no existe' });
            return;
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al crear la evaluación' });
    }
};

// PUT /api/evaluaciones/:id - Actualizar evaluación
export const actualizarEvaluacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { titulo_evaluacion, porcentaje } = req.body;

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (titulo_evaluacion !== undefined) {
            fields.push(`titulo_evaluacion = $${paramIndex++}`);
            values.push(titulo_evaluacion);
        }
        if (porcentaje !== undefined) {
            fields.push(`porcentaje = $${paramIndex++}`);
            values.push(porcentaje);
        }

        if (fields.length === 0) {
            res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
            return;
        }

        values.push(id);
        const result = await query(
            `UPDATE evaluaciones SET ${fields.join(', ')} WHERE id_evaluacion = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error({ err: error }, '[EvaluacionController] Error al actualizar evaluación:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// DELETE /api/evaluaciones/:id - Eliminar evaluación
export const eliminarEvaluacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await query(
            `DELETE FROM evaluaciones WHERE id_evaluacion = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
            return;
        }
        res.json({ success: true, message: 'Evaluación eliminada exitosamente' });
    } catch (error: any) {
        logger.error({ err: error }, '[EvaluacionController] Error al eliminar evaluación:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
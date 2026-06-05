import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';

// ============================================================
// CRUD de Clases
// ============================================================

// POST /api/clases - Crear clase
export const crearClase = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_curso, titulo, tipo_discapacidad, fecha, enlace_recurso } = req.body;

        if (!id_curso || !titulo) {
            res.status(400).json({
                success: false,
                message: 'Los campos id_curso y titulo son obligatorios',
            });
            return;
        }

        const result = await query(
            `INSERT INTO clases (id_curso, titulo, tipo_discapacidad, fecha, enlace_recurso)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                id_curso,
                titulo,
                tipo_discapacidad || null,
                fecha ? new Date(fecha) : new Date(),
                enlace_recurso || null,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Clase creada exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        if (error.code === '23503') {
            res.status(400).json({
                success: false,
                message: 'El id_curso especificado no existe en la tabla cursos',
            });
            return;
        }

        logger.error({ err: error }, '[ClaseController] Error al crear clase:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear la clase',
        });
    }
};

// GET /api/clases/curso/:id_curso - Listar clases de un curso
export const listarClasesPorCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_curso } = req.params;
        const idCurso = parseInt(id_curso, 10);

        if (isNaN(idCurso)) {
            res.status(400).json({
                success: false,
                message: 'ID de curso inválido',
            });
            return;
        }

        const result = await query(
            `SELECT cl.*, c.nombre AS curso_nombre
             FROM clases cl
             LEFT JOIN cursos c ON cl.id_curso = c.id_curso
             WHERE cl.id_curso = $1
             ORDER BY cl.fecha DESC`,
            [idCurso]
        );

        res.json({
            success: true,
            data: result.rows,
            total: result.rowCount,
        });
    } catch (error) {
        logger.error({ err: error }, '[ClaseController] Error al listar clases por curso:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al listar las clases',
        });
    }
};

// GET /api/clases/:id - Obtener detalle de una clase
export const obtenerClase = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_clase = parseInt(id, 10);

        if (isNaN(id_clase)) {
            res.status(400).json({
                success: false,
                message: 'ID de clase inválido',
            });
            return;
        }

        const result = await query(
            `SELECT cl.*, c.nombre AS curso_nombre, c.id_docente
             FROM clases cl
             LEFT JOIN cursos c ON cl.id_curso = c.id_curso
             WHERE cl.id_clase = $1`,
            [id_clase]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Clase no encontrada',
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[ClaseController] Error al obtener clase:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener la clase',
        });
    }
};

// PUT /api/clases/:id - Actualizar clase
export const actualizarClase = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_clase = parseInt(id, 10);

        if (isNaN(id_clase)) {
            res.status(400).json({
                success: false,
                message: 'ID de clase inválido',
            });
            return;
        }

        const { id_curso, titulo, tipo_discapacidad, fecha, enlace_recurso } = req.body;

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (id_curso !== undefined) {
            fields.push(`id_curso = $${paramIndex++}`);
            values.push(id_curso);
        }
        if (titulo !== undefined) {
            fields.push(`titulo = $${paramIndex++}`);
            values.push(titulo);
        }
        if (tipo_discapacidad !== undefined) {
            fields.push(`tipo_discapacidad = $${paramIndex++}`);
            values.push(tipo_discapacidad);
        }
        if (fecha !== undefined) {
            fields.push(`fecha = $${paramIndex++}`);
            values.push(new Date(fecha));
        }
        if (enlace_recurso !== undefined) {
            fields.push(`enlace_recurso = $${paramIndex++}`);
            values.push(enlace_recurso);
        }

        if (fields.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar',
            });
            return;
        }

        values.push(id_clase);
        const result = await query(
            `UPDATE clases
             SET ${fields.join(', ')}
             WHERE id_clase = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Clase no encontrada',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Clase actualizada exitosamente',
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[ClaseController] Error al actualizar clase:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar la clase',
        });
    }
};

// DELETE /api/clases/:id - Eliminar clase
export const eliminarClase = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_clase = parseInt(id, 10);

        if (isNaN(id_clase)) {
            res.status(400).json({
                success: false,
                message: 'ID de clase inválido',
            });
            return;
        }

        const result = await query(
            `DELETE FROM clases WHERE id_clase = $1
             RETURNING id_clase, titulo`,
            [id_clase]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Clase no encontrada',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Clase eliminada exitosamente',
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[ClaseController] Error al eliminar clase:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar la clase',
        });
    }
};
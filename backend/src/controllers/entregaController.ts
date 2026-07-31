import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';

// ============================================================
// Endpoint de Entrega de Tareas
// POST /api/entregas
// ============================================================

// ============================================================
// GET /api/entregas/mis-entregas
// Devuelve todas las entregas del estudiante autenticado
// (tanto de evaluaciones como de tareas de clase).
// ============================================================

export const listarMisEntregas = async (req: Request, res: Response): Promise<void> => {
    try {
        const idEstudiante = req.user?.id_usuario;
        if (!idEstudiante) {
            res.status(401).json({ success: false, message: 'No autenticado' });
            return;
        }

        const evaluaciones = await query(
            `SELECT e.id_entrega, e.id_evaluacion, e.formato_entrega, e.contenido, e.fecha_entrega
             FROM entregas_evaluacion e
             WHERE e.id_estudiante = $1`,
            [idEstudiante]
        );

        const tareas = await query(
            `SELECT t.id_entrega_tarea AS id_entrega, t.id_tarea_curso, t.formato_entrega, t.contenido, t.fecha_entrega
             FROM entregas_tarea t
             WHERE t.id_estudiante = $1`,
            [idEstudiante]
        );

        res.json({
            success: true,
            data: {
                evaluaciones: evaluaciones.rows.map((r) => ({
                    id_entrega: r.id_entrega,
                    itemId: `eva_${r.id_evaluacion}`,
                    formato: r.formato_entrega,
                    contenido: r.contenido,
                    fechaEntrega: r.fecha_entrega,
                })),
                tareas: tareas.rows.map((r) => ({
                    id_entrega: r.id_entrega,
                    itemId: `tar_${r.id_tarea_curso}`,
                    formato: r.formato_entrega,
                    contenido: r.contenido,
                    fechaEntrega: r.fecha_entrega,
                })),
            },
        });
    } catch (error: any) {
        logger.error({ err: error }, '[EntregaController] Error al listar mis entregas:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al listar las entregas',
        });
    }
};

export const crearEntrega = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_evaluacion, id_estudiante, tipo_entrega, url_enlace } = req.body;

        // Validar campos obligatorios
        if (!id_evaluacion || !id_estudiante || !tipo_entrega) {
            res.status(400).json({
                success: false,
                message:
                    'Los campos id_evaluacion, id_estudiante y tipo_entrega son obligatorios',
            });
            return;
        }

        // ─── ID Spoofing protection ────────────────────────────
        // Estudiantes solo pueden entregar con su propio ID.
        // Admins/docentes pueden entregar en nombre de cualquier estudiante.
        const userRole = (req.user?.rol || '').toLowerCase();
        const isAdminOrDocente = userRole === 'admin' || userRole === 'administrador' || userRole === 'docente';

        if (!isAdminOrDocente && Number(id_estudiante) !== req.user?.id_usuario) {
            res.status(403).json({
                success: false,
                message: 'No puede registrar una entrega para otro estudiante',
            });
            return;
        }

        const tipo = (tipo_entrega as string).toUpperCase();

        if (!['PDF', 'WORD', 'URL'].includes(tipo)) {
            res.status(400).json({
                success: false,
                message:
                    'tipo_entrega debe ser uno de: PDF, WORD, URL',
            });
            return;
        }

        let contenido: string;
        let formato_entrega: string;

        if (tipo === 'URL') {
            // --- MODO URL ---
            if (!url_enlace) {
                res.status(400).json({
                    success: false,
                    message:
                        'Para entregas de tipo URL, el campo url_enlace es obligatorio',
                });
                return;
            }
            contenido = url_enlace;
            formato_entrega = 'URL';
        } else {
            // --- MODO ARCHIVO (PDF o WORD) ---
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: `Para entregas de tipo ${tipo}, debe adjuntar un archivo`,
                });
                return;
            }

            // Guardar la ruta relativa del archivo en contenido
            contenido = req.file.path;
            formato_entrega = tipo; // 'PDF' o 'WORD'
        }

        // UPSERT usando ON CONFLICT (id_evaluacion, id_estudiante) DO UPDATE
        const result = await query(
            `INSERT INTO entregas_evaluacion
                (id_evaluacion, id_estudiante, formato_entrega, contenido, fecha_entrega)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id_evaluacion, id_estudiante)
             DO UPDATE SET
                formato_entrega = EXCLUDED.formato_entrega,
                contenido = EXCLUDED.contenido,
                fecha_entrega = NOW()
             RETURNING *`,
            [id_evaluacion, id_estudiante, formato_entrega, contenido]
        );

        res.status(201).json({
            success: true,
            message: 'Entrega registrada/actualizada exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        // Manejar error de FK violada
        if (error.code === '23503') {
            const detail = error.detail || '';
            if (detail.includes('id_evaluacion')) {
                res.status(400).json({
                    success: false,
                    message: 'La evaluación especificada no existe',
                });
            } else if (detail.includes('id_estudiante')) {
                res.status(400).json({
                    success: false,
                    message: 'El estudiante especificado no existe',
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Violación de clave foránea',
                    detail,
                });
            }
            return;
        }

        logger.error({ err: error }, '[EntregaController] Error al crear entrega:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al registrar la entrega',
        });
    }
};

// ============================================================
// Endpoint de Entrega de Tareas de Clase
// POST /api/entregas/tarea/:id
// ============================================================

export const crearEntregaTarea = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_tarea_curso = Number(req.params.id);
        const { id_estudiante, tipo_entrega, url_enlace } = req.body;

        // Validar campos obligatorios
        if (!id_tarea_curso || Number.isNaN(id_tarea_curso)) {
            res.status(400).json({
                success: false,
                message: 'El id de la tarea es obligatorio',
            });
            return;
        }

        if (!id_estudiante || !tipo_entrega) {
            res.status(400).json({
                success: false,
                message: 'Los campos id_estudiante y tipo_entrega son obligatorios',
            });
            return;
        }

        // ─── ID Spoofing protection ────────────────────────────
        const userRole = (req.user?.rol || '').toLowerCase();
        const isAdminOrDocente = userRole === 'admin' || userRole === 'administrador' || userRole === 'docente';

        if (!isAdminOrDocente && Number(id_estudiante) !== req.user?.id_usuario) {
            res.status(403).json({
                success: false,
                message: 'No puede registrar una entrega para otro estudiante',
            });
            return;
        }

        const tipo = (tipo_entrega as string).toUpperCase();

        if (!['PDF', 'WORD', 'URL'].includes(tipo)) {
            res.status(400).json({
                success: false,
                message: 'tipo_entrega debe ser uno de: PDF, WORD, URL',
            });
            return;
        }

        // ─── Validar fecha límite ──────────────────────────
        const tareaResult = await query(
            `SELECT fecha_limite FROM tareas_curso WHERE id_tarea_curso = $1`,
            [id_tarea_curso]
        );
        if (tareaResult.rows.length === 0) {
            res.status(400).json({ success: false, message: 'La tarea especificada no existe' });
            return;
        }
        const fechaLimite = tareaResult.rows[0].fecha_limite;
        if (fechaLimite) {
            const limite = new Date(fechaLimite);
            limite.setHours(23, 59, 59, 999);
            if (new Date() > limite) {
                res.status(403).json({
                    success: false,
                    message: 'La fecha límite para entregar esta tarea ha vencido',
                });
                return;
            }
        }

        let contenido: string;
        let formato_entrega: string;

        if (tipo === 'URL') {
            if (!url_enlace) {
                res.status(400).json({
                    success: false,
                    message: 'Para entregas de tipo URL, el campo url_enlace es obligatorio',
                });
                return;
            }
            contenido = url_enlace;
            formato_entrega = 'URL';
        } else {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: `Para entregas de tipo ${tipo}, debe adjuntar un archivo`,
                });
                return;
            }
            contenido = req.file.path;
            formato_entrega = tipo;
        }

        const result = await query(
            `INSERT INTO entregas_tarea
                (id_tarea_curso, id_estudiante, formato_entrega, contenido, fecha_entrega)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id_tarea_curso, id_estudiante)
             DO UPDATE SET
                formato_entrega = EXCLUDED.formato_entrega,
                contenido = EXCLUDED.contenido,
                fecha_entrega = NOW()
             RETURNING *`,
            [id_tarea_curso, id_estudiante, formato_entrega, contenido]
        );

        res.status(201).json({
            success: true,
            message: 'Entrega registrada/actualizada exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        if (error.code === '23503') {
            const detail = error.detail || '';
            if (detail.includes('id_tarea_curso')) {
                res.status(400).json({
                    success: false,
                    message: 'La tarea especificada no existe',
                });
            } else if (detail.includes('id_estudiante')) {
                res.status(400).json({
                    success: false,
                    message: 'El estudiante especificado no existe',
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Violación de clave foránea',
                    detail,
                });
            }
            return;
        }

        logger.error({ err: error }, '[EntregaController] Error al crear entrega de tarea:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al registrar la entrega',
        });
    }
};
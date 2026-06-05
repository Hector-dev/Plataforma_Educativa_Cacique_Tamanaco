import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';

// ============================================================
// Endpoint de Entrega de Tareas
// POST /api/entregas
// ============================================================

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
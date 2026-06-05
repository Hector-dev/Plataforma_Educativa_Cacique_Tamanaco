import { Request, Response } from 'express';
import pool from '../db';

// ============================================================
// Endpoint de Sincronización Masiva (Offline-First)
// POST /api/sync
// ============================================================

interface AsistenciaPayload {
    id_clase: number;
    id_estudiante: number;
    estado: string;
}

interface CalificacionPayload {
    id_evaluacion: number;
    id_estudiante: number;
    nota_preliminar: number | null;
    observaciones?: string;
}

interface SyncPayload {
    asistencias?: AsistenciaPayload[];
    calificaciones?: CalificacionPayload[];
}

export const syncData = async (req: Request, res: Response): Promise<void> => {
    const { asistencias = [], calificaciones = [] } = req.body as SyncPayload;

    // Validar que al menos haya un array con datos
    if (!Array.isArray(asistencias) || !Array.isArray(calificaciones)) {
        res.status(400).json({
            success: false,
            message: 'El payload debe contener los arrays "asistencias" y "calificaciones"',
        });
        return;
    }

    if (asistencias.length === 0 && calificaciones.length === 0) {
        res.status(400).json({
            success: false,
            message: 'Debe enviar al menos un registro de asistencia o calificación para sincronizar',
        });
        return;
    }

    const client = await pool.connect();

    try {
        // ============================================================
        // Inicio de la transacción
        // ============================================================
        await client.query('BEGIN');

        // ----------------------------------------------------------
        // 1. Sincronizar Asistencias
        // ----------------------------------------------------------
        if (asistencias.length > 0) {
            const asistenciaQuery = `
                INSERT INTO asistencias_alumnos
                    (id_clase, id_estudiante, estado, fecha_registro)
                VALUES ($1, $2, $3, CURRENT_DATE)
                ON CONFLICT (id_clase, id_estudiante)
                DO UPDATE SET
                    estado = EXCLUDED.estado,
                    fecha_registro = CURRENT_DATE
            `;

            for (const item of asistencias) {
                if (!item.id_clase || !item.id_estudiante || !item.estado) {
                    throw new Error(
                        `Asistencia inválida: los campos id_clase, id_estudiante y estado son obligatorios`
                    );
                }

                await client.query(asistenciaQuery, [
                    item.id_clase,
                    item.id_estudiante,
                    item.estado,
                ]);
            }
        }

        // ----------------------------------------------------------
        // 2. Sincronizar Calificaciones
        // ----------------------------------------------------------
        if (calificaciones.length > 0) {
            const calificacionQuery = `
                INSERT INTO calificaciones
                    (id_evaluacion, id_estudiante, nota_preliminar, observaciones, fecha_registro)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (id_evaluacion, id_estudiante)
                DO UPDATE SET
                    nota_preliminar = COALESCE(EXCLUDED.nota_preliminar, calificaciones.nota_preliminar),
                    observaciones   = COALESCE(EXCLUDED.observaciones, calificaciones.observaciones),
                    fecha_registro  = NOW()
            `;

            for (const item of calificaciones) {
                if (!item.id_evaluacion || !item.id_estudiante) {
                    throw new Error(
                        `Calificación inválida: los campos id_evaluacion e id_estudiante son obligatorios`
                    );
                }

                await client.query(calificacionQuery, [
                    item.id_evaluacion,
                    item.id_estudiante,
                    item.nota_preliminar ?? null,
                    item.observaciones ?? null,
                ]);
            }
        }

        // ============================================================
        // Confirmar transacción
        // ============================================================
        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Sincronización Exitosa',
            data: {
                asistencias_sincronizadas: asistencias.length,
                calificaciones_sincronizadas: calificaciones.length,
            },
        });
    } catch (error: any) {
        // ============================================================
        // Revertir transacción en caso de error
        // ============================================================
        await client.query('ROLLBACK');

        // Errores conocidos de PostgreSQL (códigos de violación de FK)
        if (error.code === '23503') {
            const detail = error.detail || '';
            if (detail.includes('id_clase')) {
                res.status(400).json({
                    success: false,
                    message: 'Una o más clases especificadas no existen en la base de datos',
                });
            } else if (detail.includes('id_estudiante')) {
                res.status(400).json({
                    success: false,
                    message: 'Uno o más estudiantes especificados no existen en la base de datos',
                });
            } else if (detail.includes('id_evaluacion')) {
                res.status(400).json({
                    success: false,
                    message: 'Una o más evaluaciones especificadas no existen en la base de datos',
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

        console.error('[SyncController] Error durante la sincronización masiva:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor durante la sincronización',
        });
    } finally {
        // Liberar el cliente de vuelta al pool
        client.release();
    }
};
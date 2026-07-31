import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query, getClient } from '../db';
import {
    esDocenteOAdmin,
    verificarOwnershipBatchClases,
    verificarOwnershipBatchEvaluaciones,
} from '../utils/authorization';
import { syncPayloadSchema } from '../utils/validators';

// ============================================================
// Endpoint de Sincronización Masiva (Offline-First)
// POST /api/sync
// ============================================================

interface AsistenciaPayload {
    id_sesion: number;
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
    // Validar payload completo con Zod (tipos, rangos y estados permitidos).
    const parsed = syncPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            success: false,
            message: 'Payload de sincronización inválido',
            errors: parsed.error.flatten(),
        });
        return;
    }

    const { asistencias, calificaciones } = parsed.data;

    if (asistencias.length === 0 && calificaciones.length === 0) {
        res.status(400).json({
            success: false,
            message: 'Debe enviar al menos un registro de asistencia o calificación para sincronizar',
        });
        return;
    }

    // Validar rol: solo docentes y administradores pueden sincronizar asistencias/calificaciones.
    if (!req.user || !esDocenteOAdmin(req.user.rol)) {
        res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo docentes y administradores pueden sincronizar asistencias y calificaciones.',
        });
        return;
    }

    // Verificar ownership de clases y evaluaciones incluidas en el payload.
    const idsClase = asistencias.map((a) => a.id_clase);
    const idsSesion = asistencias.map((a) => a.id_sesion);
    const idsEvaluacion = calificaciones.map((c) => c.id_evaluacion);
    const [clasesAutorizadas, evaluacionesAutorizadas] = await Promise.all([
        verificarOwnershipBatchClases(idsClase, req.user),
        verificarOwnershipBatchEvaluaciones(idsEvaluacion, req.user),
    ]);
    if (!clasesAutorizadas || !evaluacionesAutorizadas) {
        res.status(403).json({
            success: false,
            message: 'Acceso denegado. No tiene permiso para sincronizar datos de clases o evaluaciones ajenas.',
        });
        return;
    }

    // Verificar que las sesiones existan, estén abiertas y coincidan con las clases indicadas.
    if (asistencias.length > 0) {
        const sesionesResult = await query(
            `SELECT id_sesion, id_clase, estado FROM sesiones_asistencia WHERE id_sesion = ANY($1)`,
            [idsSesion]
        );
        const sesionesMap = new Map<number, { id_clase: number; estado: string }>();
        for (const row of sesionesResult.rows) {
            sesionesMap.set(Number(row.id_sesion), {
                id_clase: Number(row.id_clase),
                estado: row.estado,
            });
        }

        for (const item of asistencias) {
            const sesion = sesionesMap.get(item.id_sesion);
            if (!sesion) {
                res.status(400).json({
                    success: false,
                    message: `La sesión ${item.id_sesion} no existe`,
                });
                return;
            }
            if (sesion.estado !== 'abierta') {
                res.status(409).json({
                    success: false,
                    message: `La sesión ${item.id_sesion} está cerrada`,
                });
                return;
            }
            if (sesion.id_clase !== item.id_clase) {
                res.status(400).json({
                    success: false,
                    message: `La sesión ${item.id_sesion} no corresponde a la clase ${item.id_clase}`,
                });
                return;
            }
        }
    }

    const client = await getClient();

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
                    (id_sesion, id_clase, id_estudiante, estado, fecha_registro)
                VALUES ($1, $2, $3, $4, CURRENT_DATE)
                ON CONFLICT (id_sesion, id_estudiante)
                DO UPDATE SET
                    estado = EXCLUDED.estado,
                    fecha_registro = CURRENT_DATE
            `;

            for (const item of asistencias) {
                if (!item.id_sesion || !item.id_clase || !item.id_estudiante || !item.estado) {
                    throw new Error(
                        `Asistencia inválida: los campos id_sesion, id_clase, id_estudiante y estado son obligatorios`
                    );
                }

                await client.query(asistenciaQuery, [
                    item.id_sesion,
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

        logger.error({ err: error }, '[SyncController] Error durante la sincronización masiva:');
        res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor durante la sincronización',
        });
    } finally {
        // Liberar el cliente de vuelta al pool
        client.release();
    }
};
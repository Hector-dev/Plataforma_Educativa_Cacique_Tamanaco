import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { query } from '../db';

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

        // DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
        // Queremos: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
        const diasMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
        const semana = [0, 0, 0, 0, 0]; // Lun-Vie

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

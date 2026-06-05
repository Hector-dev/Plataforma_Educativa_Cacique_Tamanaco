import { Request, Response } from 'express';
import { query } from '../db';

// ============================================================
// Endpoint de Reporte de Rendimiento por Curso
// GET /api/reportes/rendimiento/:id_curso
// ============================================================

export const rendimientoCurso = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id_curso } = req.params;

        if (!id_curso || isNaN(Number(id_curso))) {
            res.status(400).json({
                success: false,
                message: 'El parámetro id_curso debe ser un número válido',
            });
            return;
        }

        const sql = `
            -- CTE: Total de evaluaciones del curso
            WITH total_evaluaciones_curso AS (
                SELECT COUNT(DISTINCT e.id_evaluacion) AS total
                FROM clases cl
                JOIN evaluaciones e ON e.id_clase = cl.id_clase
                WHERE cl.id_curso = $1
            )
            SELECT
                u.id_usuario,
                u.nombre_completo,
                u.cedula,
                COALESCE(
                    ROUND(AVG(c.nota_definitiva), 2),
                    0
                ) AS promedio_definitivo,
                COALESCE(
                    ROUND(
                        (COUNT(DISTINCT ee.id_evaluacion)::numeric
                         / NULLIF((SELECT total FROM total_evaluaciones_curso), 0)
                        ) * 100,
                        2
                    ),
                    0
                ) AS porcentaje_entregas
            FROM matriculas m
            JOIN usuarios u ON u.id_usuario = m.id_estudiante
            LEFT JOIN calificaciones c
                ON c.id_estudiante = m.id_estudiante
                AND c.id_evaluacion IN (
                    SELECT e.id_evaluacion
                    FROM evaluaciones e
                    JOIN clases cl ON cl.id_clase = e.id_clase
                    WHERE cl.id_curso = $1
                )
            LEFT JOIN entregas_evaluacion ee
                ON ee.id_estudiante = m.id_estudiante
                AND ee.id_evaluacion IN (
                    SELECT e.id_evaluacion
                    FROM evaluaciones e
                    JOIN clases cl ON cl.id_clase = e.id_clase
                    WHERE cl.id_curso = $1
                )
            WHERE m.id_curso = $1
            GROUP BY u.id_usuario, u.nombre_completo, u.cedula
            ORDER BY u.nombre_completo;
        `;

        const result = await query(sql, [id_curso]);

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message:
                    'No se encontraron estudiantes matriculados en este curso, o el curso no existe',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Reporte de rendimiento generado exitosamente',
            data: result.rows,
        });
    } catch (error: any) {
        console.error(
            '[ReporteController] Error al generar reporte de rendimiento:',
            error
        );
        res.status(500).json({
            success: false,
            message:
                'Error interno del servidor al generar el reporte de rendimiento',
        });
    }
};

// ============================================================
// Reporte de Asistencia General
// GET /api/reportes/asistencia-general
// ============================================================
export const asistenciaGeneral = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT
                c.id_curso,
                c.nombre AS curso,
                COUNT(DISTINCT a.id_asistencia) AS total_asistencias,
                COUNT(DISTINCT cl.id_clase) AS total_clases,
                COUNT(DISTINCT a.id_estudiante) AS estudiantes_con_asistencia,
                ROUND(
                    COUNT(DISTINCT a.id_asistencia)::numeric /
                    NULLIF(COUNT(DISTINCT cl.id_clase), 0), 2
                ) AS promedio_asistencia_por_clase
            FROM cursos c
            JOIN clases cl ON cl.id_curso = c.id_curso
            LEFT JOIN asistencias_alumnos a ON a.id_clase = cl.id_clase AND a.estado = 'presente'
            GROUP BY c.id_curso, c.nombre
            ORDER BY c.nombre
        `);

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('[ReporteController] Error en asistencia general:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de asistencia general' });
    }
};

// ============================================================
// Reporte de Asistencia por Curso (detalle por estudiante)
// GET /api/reportes/asistencia-por-curso/:id_curso
// ============================================================
export const asistenciaPorCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_curso } = req.params;
        if (!id_curso || isNaN(Number(id_curso))) {
            res.status(400).json({ success: false, message: 'id_curso debe ser un número válido' });
            return;
        }

        const result = await query(`
            SELECT
                u.id_usuario,
                u.nombre_completo,
                u.cedula,
                COUNT(DISTINCT a.id_asistencia) FILTER (WHERE a.estado = 'presente') AS presentes,
                COUNT(DISTINCT cl.id_clase) AS total_clases,
                ROUND(
                    COUNT(DISTINCT a.id_asistencia) FILTER (WHERE a.estado = 'presente')::numeric /
                    NULLIF(COUNT(DISTINCT cl.id_clase), 0) * 100, 1
                ) AS porcentaje_asistencia
            FROM matriculas m
            JOIN usuarios u ON u.id_usuario = m.id_estudiante
            JOIN clases cl ON cl.id_curso = m.id_curso
            LEFT JOIN asistencias_alumnos a ON a.id_estudiante = u.id_usuario AND a.id_clase = cl.id_clase
            WHERE m.id_curso = $1
            GROUP BY u.id_usuario, u.nombre_completo, u.cedula
            ORDER BY porcentaje_asistencia DESC
        `, [id_curso]);

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('[ReporteController] Error en asistencia por curso:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de asistencia por curso' });
    }
};

// ============================================================
// Reporte de Estudiantes por Género
// GET /api/reportes/estudiantes-por-genero
// ============================================================
export const estudiantesPorGenero = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT
                COALESCE(genero, 'no_especificado') AS genero,
                COUNT(*) AS total_estudiantes,
                ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS porcentaje
            FROM usuarios
            WHERE rol = 'estudiante'
            GROUP BY genero
            ORDER BY total_estudiantes DESC
        `);

        const total = result.rows.reduce((acc: number, r: any) => acc + parseInt(r.total_estudiantes, 10), 0);

        res.json({ success: true, data: result.rows, total });
    } catch (error: any) {
        console.error('[ReporteController] Error en estudiantes por género:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de estudiantes por género' });
    }
};
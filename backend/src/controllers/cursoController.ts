import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import path from 'path';
import { query } from '../db';
import { esAdmin, verificarOwnershipCurso } from '../utils/authorization';
import { detectarTipoRecurso } from '../middleware/materialUploadMiddleware';

// ============================================================
// CRUD de Cursos
// ============================================================

// POST /api/cursos - Crear curso
export const crearCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        let { id_docente, nombre, descripcion } = req.body;

        if (!id_docente || !nombre) {
            res.status(400).json({
                success: false,
                message: 'Los campos id_docente y nombre son obligatorios',
            });
            return;
        }

        // Un docente solo puede crear cursos asignados a sí mismo.
        if (req.user && !esAdmin(req.user.rol)) {
            id_docente = req.user.id_usuario;
        }

        const result = await query(
            `INSERT INTO cursos (id_docente, nombre, descripcion, creado_en)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [id_docente, nombre, descripcion || null]
        );

        res.status(201).json({
            success: true,
            message: 'Curso creado exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        if (error.code === '23503') {
            res.status(400).json({
                success: false,
                message: 'El id_docente especificado no existe en la tabla usuarios',
            });
            return;
        }

        logger.error({ err: error }, '[CursoController] Error al crear curso:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear el curso',
        });
    }
};

// GET /api/cursos - Listar todos los cursos (con paginación)
// Parámetros de consulta: ?page=1&limit=20
export const listarCursos = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
        const offset = (page - 1) * limit;

        // Obtener total de cursos para metadatos de paginación
        const countResult = await query(`SELECT COUNT(*)::int AS total FROM cursos`);
        const total = countResult.rows[0]?.total || 0;

        const result = await query(
            `SELECT c.*, u.nombre_completo AS docente_nombre
             FROM cursos c
             LEFT JOIN usuarios u ON c.id_docente = u.id_usuario
             ORDER BY c.creado_en DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            success: true,
            data: result.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al listar cursos:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al listar cursos',
        });
    }
};

// ============================================================
// GET /api/cursos/mis-cursos - Cursos del estudiante autenticado
// ============================================================
export const listarMisCursos = async (req: Request, res: Response): Promise<void> => {
    try {
        const idEstudiante = req.user!.id_usuario;
        const result = await query(
            `SELECT c.*, u.nombre_completo AS docente_nombre, m.fecha_inscripcion, m.estado AS estado_matricula
             FROM cursos c
             JOIN matriculas m ON m.id_curso = c.id_curso
             LEFT JOIN usuarios u ON c.id_docente = u.id_usuario
             WHERE m.id_estudiante = $1 AND m.estado = 'activo'
             ORDER BY m.fecha_inscripcion DESC`,
            [idEstudiante]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al listar mis cursos:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/cursos/:id - Obtener un curso por ID
export const obtenerCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);

        if (isNaN(id_curso)) {
            res.status(400).json({
                success: false,
                message: 'ID de curso inválido',
            });
            return;
        }

        const result = await query(
            `SELECT c.*, u.nombre_completo AS docente_nombre
             FROM cursos c
             LEFT JOIN usuarios u ON c.id_docente = u.id_usuario
             WHERE c.id_curso = $1`,
            [id_curso]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Curso no encontrado',
            });
            return;
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al obtener curso:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener el curso',
        });
    }
};

// PUT /api/cursos/:id - Actualizar curso
export const actualizarCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);

        if (isNaN(id_curso)) {
            res.status(400).json({
                success: false,
                message: 'ID de curso inválido',
            });
            return;
        }

        if (!req.user || !(await verificarOwnershipCurso(id_curso, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para actualizar este curso',
            });
            return;
        }

        const { id_docente, nombre, descripcion } = req.body;

        // Solo los administradores pueden reasignar el docente de un curso.
        if (id_docente !== undefined && !esAdmin(req.user.rol)) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para cambiar el docente del curso',
            });
            return;
        }

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (id_docente !== undefined) {
            fields.push(`id_docente = $${paramIndex++}`);
            values.push(id_docente);
        }
        if (nombre !== undefined) {
            fields.push(`nombre = $${paramIndex++}`);
            values.push(nombre);
        }
        if (descripcion !== undefined) {
            fields.push(`descripcion = $${paramIndex++}`);
            values.push(descripcion);
        }

        if (fields.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar',
            });
            return;
        }

        values.push(id_curso);
        const result = await query(
            `UPDATE cursos
             SET ${fields.join(', ')}
             WHERE id_curso = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Curso no encontrado',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Curso actualizado exitosamente',
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al actualizar curso:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar el curso',
        });
    }
};

// DELETE /api/cursos/:id - Eliminar curso
export const eliminarCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);

        if (isNaN(id_curso)) {
            res.status(400).json({
                success: false,
                message: 'ID de curso inválido',
            });
            return;
        }

        if (!req.user || !(await verificarOwnershipCurso(id_curso, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para eliminar este curso',
            });
            return;
        }

        const result = await query(
            `DELETE FROM cursos WHERE id_curso = $1
             RETURNING id_curso, nombre`,
            [id_curso]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Curso no encontrado',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Curso eliminado exitosamente',
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al eliminar curso:');
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar el curso',
        });
    }
};

// POST /api/cursos/:id/matricular - Matricular estudiante en un curso
export const matricularEstudiante = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);
        const { id_estudiante } = req.body;

        if (isNaN(id_curso)) {
            res.status(400).json({ success: false, message: 'ID de curso inválido' });
            return;
        }

        if (!id_estudiante) {
            res.status(400).json({ success: false, message: 'id_estudiante es requerido' });
            return;
        }

        // Verificar ownership del curso
        if (!req.user || !(await verificarOwnershipCurso(id_curso, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para matricular estudiantes en este curso',
            });
            return;
        }

        // Verificar que el curso existe
        const cursoCheck = await query(`SELECT id_curso FROM cursos WHERE id_curso = $1`, [id_curso]);
        if (cursoCheck.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Curso no encontrado' });
            return;
        }

        // Verificar que el estudiante existe y tiene rol Estudiante
        const estCheck = await query(
            `SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND LOWER(rol) = 'estudiante'`,
            [id_estudiante]
        );
        if (estCheck.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
            return;
        }

        // Verificar que no esté ya matriculado
        const dupCheck = await query(
            `SELECT id_matricula FROM matriculas WHERE id_curso = $1 AND id_estudiante = $2`,
            [id_curso, id_estudiante]
        );
        if (dupCheck.rows.length > 0) {
            res.status(409).json({ success: false, message: 'El estudiante ya está matriculado en este curso' });
            return;
        }

        const result = await query(
            `INSERT INTO matriculas (id_curso, id_estudiante, estado, fecha_inscripcion)
             VALUES ($1, $2, 'activo', NOW())
             RETURNING *`,
            [id_curso, id_estudiante]
        );

        res.status(201).json({
            success: true,
            message: 'Estudiante matriculado exitosamente',
            data: result.rows[0],
        });
    } catch (error: any) {
        if (error.code === '23503') {
            res.status(400).json({
                success: false,
                message: 'El curso o estudiante especificado no existe',
            });
            return;
        }
        logger.error({ err: error }, '[CursoController] Error al matricular:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/cursos/:id/matriculados - Listar estudiantes matriculados en un curso
// GET /api/cursos/:id/estudiantes-disponibles - Listar estudiantes no matriculados en un curso
export const listarEstudiantesDisponibles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);
        if (isNaN(id_curso)) {
            res.status(400).json({ success: false, message: 'ID de curso inválido' });
            return;
        }

        if (!req.user || !(await verificarOwnershipCurso(id_curso, req.user))) {
            res.status(403).json({ success: false, message: 'No tiene permiso para listar estudiantes de este curso' });
            return;
        }

        const result = await query(
            `SELECT u.id_usuario, u.nombre_completo, u.cedula, u.email
             FROM usuarios u
             WHERE LOWER(u.rol) = 'estudiante'
               AND u.id_usuario NOT IN (
                   SELECT m.id_estudiante
                   FROM matriculas m
                   WHERE m.id_curso = $1 AND m.estado = 'activo'
               )
             ORDER BY u.nombre_completo`,
            [id_curso]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al listar estudiantes disponibles:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/cursos/:id/matriculados - Listar estudiantes matriculados en un curso
export const listarMatriculados = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);
        if (isNaN(id_curso)) {
            res.status(400).json({ success: false, message: 'ID de curso inválido' });
            return;
        }

        const result = await query(
            `SELECT u.id_usuario, u.nombre_completo, u.cedula, u.email, m.id_matricula, m.fecha_inscripcion
             FROM matriculas m
             JOIN usuarios u ON u.id_usuario = m.id_estudiante
             WHERE m.id_curso = $1 AND m.estado = 'activo'
             ORDER BY m.fecha_inscripcion DESC`,
            [id_curso]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al listar matriculados:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// DELETE /api/cursos/:id/matricular/:idEstudiante - Retirar estudiante de un curso
export const retirarEstudiante = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, idEstudiante } = req.params;
        const id_curso = parseInt(id, 10);
        const id_estudiante = parseInt(idEstudiante, 10);

        if (isNaN(id_curso) || isNaN(id_estudiante)) {
            res.status(400).json({ success: false, message: 'ID de curso o estudiante inválido' });
            return;
        }

        if (!req.user || !(await verificarOwnershipCurso(id_curso, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para retirar estudiantes de este curso',
            });
            return;
        }

        const result = await query(
            `DELETE FROM matriculas WHERE id_curso = $1 AND id_estudiante = $2 AND estado = 'activo'
             RETURNING *`,
            [id_curso, id_estudiante]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'No se encontró una matrícula activa para este estudiante en el curso' });
            return;
        }

        res.json({
            success: true,
            message: 'Estudiante retirado del curso exitosamente',
            data: result.rows[0],
        });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al retirar estudiante:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ============================================================
// Endpoints del Editor Visual Canvas
// ============================================================

// GET /api/cursos/:id/document - Obtener el documento completo del curso
// (estructura jerárquica: módulos → clases → evaluaciones + materiales)
export const obtenerDocumentoCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);

        if (isNaN(id_curso)) {
            res.status(400).json({ success: false, message: 'ID de curso inválido' });
            return;
        }

        // 1. Obtener el curso base
        const cursoResult = await query(
            `SELECT c.*, u.nombre_completo AS docente_nombre
             FROM cursos c
             LEFT JOIN usuarios u ON c.id_docente = u.id_usuario
             WHERE c.id_curso = $1`,
            [id_curso]
        );

        if (cursoResult.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Curso no encontrado' });
            return;
        }

        const curso = cursoResult.rows[0];

        // 2. Obtener módulos
        const modulosResult = await query(
            `SELECT * FROM modulos WHERE id_curso = $1 ORDER BY orden, id_modulo`,
            [id_curso]
        );
        const modulos = modulosResult.rows;

        // 3. Obtener todas las clases del curso
        const clasesResult = await query(
            `SELECT * FROM clases WHERE id_curso = $1 ORDER BY orden, id_clase`,
            [id_curso]
        );
        const todasLasClases = clasesResult.rows;

        // 4. Obtener evaluaciones para todas las clases
        const evaluacionesResult = await query(
            `SELECT e.* FROM evaluaciones e
             JOIN clases c ON c.id_clase = e.id_clase
             WHERE c.id_curso = $1
             ORDER BY e.id_clase, e.orden, e.id_evaluacion`,
            [id_curso]
        );

        // 5. Obtener materiales_curso para todas las clases
        const materialesResult = await query(
            `SELECT mc.* FROM materiales_curso mc
             JOIN clases c ON c.id_clase = mc.id_clase
             WHERE c.id_curso = $1
             ORDER BY mc.id_clase, mc.orden, mc.id_material_curso`,
            [id_curso]
        );

        // 6b. Obtener quizzes asociados a evaluaciones de este curso
        const quizzesResult = await query(
            `SELECT q.id_quiz, q.id_evaluacion FROM quizzes q
             JOIN evaluaciones e ON e.id_evaluacion = q.id_evaluacion
             JOIN clases c ON c.id_clase = e.id_clase
             WHERE c.id_curso = $1`,
            [id_curso]
        );
        const evaluacionesConQuiz = new Set<number>();
        for (const q of quizzesResult.rows) {
            evaluacionesConQuiz.add(q.id_evaluacion);
        }

        // 7. Indexar evaluaciones y materiales por id_clase
        const evaluacionesPorClase: Record<number, any[]> = {};
        for (const ev of evaluacionesResult.rows) {
            if (!evaluacionesPorClase[ev.id_clase]) evaluacionesPorClase[ev.id_clase] = [];
            const tieneQuiz = evaluacionesConQuiz.has(ev.id_evaluacion);
            evaluacionesPorClase[ev.id_clase].push({
                tipo: tieneQuiz ? 'quiz' as const : 'evaluacion' as const,
                id: `eva_${ev.id_evaluacion}`,
                titulo: ev.titulo_evaluacion,
                descripcion: ev.descripcion || '',
                porcentaje: parseFloat(ev.porcentaje),
                orden: parseFloat(ev.orden),
                ...(tieneQuiz ? { tieneQuiz: true } : {}),
            });
        }

        const materialesPorClase: Record<number, any[]> = {};
        for (const mat of materialesResult.rows) {
            if (!materialesPorClase[mat.id_clase]) materialesPorClase[mat.id_clase] = [];
            materialesPorClase[mat.id_clase].push({
                tipo: 'material' as const,
                id: `mat_${mat.id_material_curso}`,
                titulo: mat.titulo,
                descripcion: mat.descripcion || '',
                urlRecurso: mat.url_recurso || '',
                tipoRecurso: mat.tipo_recurso,
                orden: parseFloat(mat.orden),
            });
        }

        // 8. Función auxiliar para construir una lección a partir de una clase
        const buildLeccion = (clase: any) => {
            const items = [
                ...(evaluacionesPorClase[clase.id_clase] || []),
                ...(materialesPorClase[clase.id_clase] || []),
            ].sort((a, b) => a.orden - b.orden);

            return {
                id: `lec_${clase.id_clase}`,
                titulo: clase.titulo,
                descripcion: clase.descripcion || '',
                tipoDiscapacidad: clase.tipo_discapacidad || null,
                fecha: clase.fecha ? new Date(clase.fecha).toISOString() : null,
                enlaceRecurso: clase.enlace_recurso || null,
                duracionMinutos: clase.duracion_minutos || null,
                orden: parseFloat(clase.orden),
                items,
            };
        };

        // 9. Agrupar clases por módulo y lecciones sueltas
        const clasesPorModulo: Record<number, any[]> = {};
        const leccionesSueltas: any[] = [];

        for (const clase of todasLasClases) {
            if (clase.id_modulo) {
                if (!clasesPorModulo[clase.id_modulo]) clasesPorModulo[clase.id_modulo] = [];
                clasesPorModulo[clase.id_modulo].push(buildLeccion(clase));
            } else {
                leccionesSueltas.push(buildLeccion(clase));
            }
        }

        // 10. Construir módulos con sus lecciones
        const modulosConLecciones = modulos.map((mod) => ({
            id: `mod_${mod.id_modulo}`,
            titulo: mod.titulo,
            descripcion: mod.descripcion || '',
            orden: parseFloat(mod.orden),
            lecciones: (clasesPorModulo[mod.id_modulo] || []).sort(
                (a, b) => a.orden - b.orden
            ),
        }));

        // 11. Construir documento final
        const documento = {
            id: `c_${curso.id_curso}`,
            nombre: curso.nombre,
            descripcion: curso.descripcion || '',
            id_docente: curso.id_docente,
            version: curso.version || 1,
            updatedAt: curso.creado_en ? new Date(curso.creado_en).toISOString() : new Date().toISOString(),
            modulos: modulosConLecciones,
            leccionesSueltas: leccionesSueltas.sort((a, b) => a.orden - b.orden),
        };

        res.json({ success: true, data: documento });
    } catch (error) {
        logger.error({ err: error }, '[CursoController] Error al obtener documento del curso:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// PUT /api/cursos/:id/document - Guardar el documento completo del curso
// Recibe el JSON jerárquico y sincroniza con la BD (diff + upsert/delete)
// Incluye: validación de ownership, control de concurrencia con versionado,
//          y asignación de IDs reales del lado del servidor.
export const guardarDocumentoCurso = async (req: Request, res: Response): Promise<void> => {
    const client = await (await import('../db')).default.connect();
    try {
        const { id } = req.params;
        const id_curso = parseInt(id, 10);

        if (isNaN(id_curso)) {
            res.status(400).json({ success: false, message: 'ID de curso inválido' });
            return;
        }

        const doc = req.body;

        if (!req.user) {
            await client.query('ROLLBACK');
            res.status(401).json({ success: false, message: 'No autenticado' });
            return;
        }

        if (!doc || doc.modulos === undefined || doc.leccionesSueltas === undefined) {
            await client.query('ROLLBACK');
            res.status(400).json({ success: false, message: 'Documento inválido. Se requiere modulos y leccionesSueltas.' });
            return;
        }

        await client.query('BEGIN');

        // 0. Verificar que el curso existe y obtener sus datos actuales
        const cursoActual = await client.query(
            `SELECT id_docente, version FROM cursos WHERE id_curso = $1 FOR UPDATE`,
            [id_curso]
        );

        if (cursoActual.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ success: false, message: 'Curso no encontrado' });
            return;
        }

        const { id_docente: idDocenteBD, version: versionBD } = cursoActual.rows[0];

        // 0a. Validar ownership: solo el docente dueño o un admin pueden modificar
        const userRoleNorm = (req.user.rol || '').toLowerCase() === 'administrador' ? 'admin' : (req.user.rol || '').toLowerCase();
        const esAdmin = userRoleNorm === 'admin';
        const esDueno = req.user.id_usuario === idDocenteBD;
        if (!esAdmin && !esDueno) {
            await client.query('ROLLBACK');
            res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este curso. Solo el docente asignado puede editarlo.',
            });
            return;
        }

        // 0b. Control de concurrencia optimista: verificar versión
        const versionEnviada: number = doc.version || 0;
        if (versionEnviada !== versionBD) {
            await client.query('ROLLBACK');
            res.status(409).json({
                success: false,
                message: 'Conflicto de edición. El curso fue modificado por otro usuario. Recarga la página para obtener la última versión.',
                versionServidor: versionBD,
                versionEnviada,
            });
            return;
        }

        const nuevaVersion = versionBD + 1;

        // 1. Actualizar datos base del curso e incrementar versión
        await client.query(
            `UPDATE cursos SET nombre = $1, descripcion = $2, version = $3 WHERE id_curso = $4`,
            [doc.nombre, doc.descripcion || null, nuevaVersion, id_curso]
        );

        // 2. Sincronizar módulos
        const modulosEnviados = doc.modulos || [];
        const idsModulosEnviados: number[] = [];

        for (let i = 0; i < modulosEnviados.length; i++) {
            const mod = modulosEnviados[i];
            const id_modulo = mod.id && mod.id.startsWith('mod_')
                ? parseInt(mod.id.replace('mod_', ''), 10)
                : null;

            let result;
            if (id_modulo) {
                // UPDATE módulo existente
                result = await client.query(
                    `UPDATE modulos SET titulo = $1, descripcion = $2, orden = $3
                     WHERE id_modulo = $4 AND id_curso = $5
                     RETURNING id_modulo`,
                    [mod.titulo, mod.descripcion || null, i + 1, id_modulo, id_curso]
                );
                if (result.rows.length > 0) idsModulosEnviados.push(id_modulo);
            }

            if (!id_modulo || result?.rows.length === 0) {
                // INSERT nuevo módulo
                result = await client.query(
                    `INSERT INTO modulos (id_curso, titulo, descripcion, orden)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id_modulo`,
                    [id_curso, mod.titulo, mod.descripcion || null, i + 1]
                );
                idsModulosEnviados.push(result.rows[0].id_modulo);
                // Actualizar el id en la respuesta
                mod.id = `mod_${result.rows[0].id_modulo}`;
            }
        }

        // Eliminar módulos que ya no están en el documento
        if (idsModulosEnviados.length > 0) {
            await client.query(
                `DELETE FROM modulos WHERE id_curso = $1 AND id_modulo != ALL($2::int[])`,
                [id_curso, idsModulosEnviados]
            );
        } else {
            await client.query(`DELETE FROM modulos WHERE id_curso = $1`, [id_curso]);
        }

        // 3. Sincronizar lecciones (clases)
        // Recolectar todas las lecciones de módulos y sueltas
        interface LeccionConModulo {
            leccion: any;
            id_modulo: number | null;
        }
        const todasLasLecciones: LeccionConModulo[] = [];

        for (const mod of modulosEnviados) {
            const id_modulo = parseInt(mod.id.replace('mod_', ''), 10);
            for (const lec of mod.lecciones || []) {
                todasLasLecciones.push({ leccion: lec, id_modulo });
            }
        }
        for (const lec of doc.leccionesSueltas || []) {
            todasLasLecciones.push({ leccion: lec, id_modulo: null });
        }

        const idsClasesEnviadas: number[] = [];

        for (let i = 0; i < todasLasLecciones.length; i++) {
            const { leccion: lec, id_modulo } = todasLasLecciones[i];
            const id_clase = lec.id && lec.id.startsWith('lec_')
                ? parseInt(lec.id.replace('lec_', ''), 10)
                : null;

            let result;
            if (id_clase) {
                result = await client.query(
                    `UPDATE clases SET titulo = $1, descripcion = $2, tipo_discapacidad = $3,
                         fecha = $4, enlace_recurso = $5, duracion_minutos = $6,
                         orden = $7, id_modulo = $8
                     WHERE id_clase = $9 AND id_curso = $10
                     RETURNING id_clase`,
                    [lec.titulo, lec.descripcion || null, lec.tipoDiscapacidad || null,
                     lec.fecha || new Date().toISOString(), lec.enlaceRecurso || null,
                     lec.duracionMinutos || null, i + 1, id_modulo,
                     id_clase, id_curso]
                );
                if (result.rows.length > 0) idsClasesEnviadas.push(id_clase);
            }

            if (!id_clase || result?.rows.length === 0) {
                result = await client.query(
                    `INSERT INTO clases (id_curso, titulo, descripcion, tipo_discapacidad,
                         fecha, enlace_recurso, duracion_minutos, orden, id_modulo)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING id_clase`,
                    [id_curso, lec.titulo, lec.descripcion || null, lec.tipoDiscapacidad || null,
                     lec.fecha || new Date().toISOString(), lec.enlaceRecurso || null,
                     lec.duracionMinutos || null, i + 1, id_modulo]
                );
                idsClasesEnviadas.push(result.rows[0].id_clase);
                lec.id = `lec_${result.rows[0].id_clase}`;
            }
        }

        // Eliminar clases huérfanas
        if (idsClasesEnviadas.length > 0) {
            await client.query(
                `DELETE FROM clases WHERE id_curso = $1 AND id_clase != ALL($2::int[])`,
                [id_curso, idsClasesEnviadas]
            );
        } else {
            await client.query(`DELETE FROM clases WHERE id_curso = $1`, [id_curso]);
        }

        // 4. Sincronizar evaluaciones y materiales dentro de cada clase
        for (const { leccion: lec } of todasLasLecciones) {
            const id_clase = parseInt(lec.id.replace('lec_', ''), 10);
            const items = lec.items || [];

            const idsEvalEnviadas: number[] = [];
            const idsMatEnviados: number[] = [];

            for (let j = 0; j < items.length; j++) {
                const item = items[j];

                if (item.tipo === 'evaluacion' || item.tipo === 'quiz') {
                    const id_eval = item.id && (item.id.startsWith('eva_') || item.id.startsWith('qz_'))
                        ? parseInt(item.id.replace(/^(eva_|qz_)/, ''), 10) : null;

                    let evalResult;
                    if (id_eval) {
                        evalResult = await client.query(
                            `UPDATE evaluaciones SET titulo_evaluacion = $1, porcentaje = $2,
                                 descripcion = $3, orden = $4
                             WHERE id_evaluacion = $5 AND id_clase = $6
                             RETURNING id_evaluacion`,
                            [item.titulo, item.porcentaje, item.descripcion || null, j + 1, id_eval, id_clase]
                        );
                        if (evalResult.rows.length > 0) idsEvalEnviadas.push(id_eval);
                    }

                    if (!id_eval || evalResult?.rows.length === 0) {
                        evalResult = await client.query(
                            `INSERT INTO evaluaciones (id_clase, titulo_evaluacion, porcentaje, descripcion, orden)
                             VALUES ($1, $2, $3, $4, $5)
                             RETURNING id_evaluacion`,
                            [id_clase, item.titulo, item.porcentaje, item.descripcion || null, j + 1]
                        );
                        idsEvalEnviadas.push(evalResult.rows[0].id_evaluacion);
                        item.id = `eva_${evalResult.rows[0].id_evaluacion}`;
                    }

                    // ── Auto-crear registro en tabla quizzes si es tipo 'quiz' ──
                    if (item.tipo === 'quiz') {
                        const finalEvalId = id_eval || evalResult!.rows[0].id_evaluacion;
                        const quizExistente = await client.query(
                            `SELECT id_quiz FROM quizzes WHERE id_evaluacion = $1`, [finalEvalId]
                        );
                        if (quizExistente.rows.length === 0) {
                            await client.query(
                                `INSERT INTO quizzes (id_evaluacion, titulo, descripcion, activo)
                                 VALUES ($1, $2, $3, true)`,
                                [finalEvalId, item.titulo, item.descripcion || null]
                            );
                        }
                        // Marcar en el documento que ya tiene quiz creado
                        item.tieneQuiz = true;
                    }
                } else if (item.tipo === 'material') {
                    const id_mat = item.id && item.id.startsWith('mat_')
                        ? parseInt(item.id.replace('mat_', ''), 10) : null;

                    let matResult;
                    if (id_mat) {
                        matResult = await client.query(
                            `UPDATE materiales_curso SET titulo = $1, descripcion = $2,
                                 url_recurso = $3, tipo_recurso = $4, orden = $5
                             WHERE id_material_curso = $6 AND id_clase = $7
                             RETURNING id_material_curso`,
                            [item.titulo, item.descripcion || null, item.urlRecurso || '',
                             item.tipoRecurso || 'documento', j + 1, id_mat, id_clase]
                        );
                        if (matResult.rows.length > 0) idsMatEnviados.push(id_mat);
                    }

                    if (!id_mat || matResult?.rows.length === 0) {
                        matResult = await client.query(
                            `INSERT INTO materiales_curso (id_clase, titulo, descripcion, url_recurso, tipo_recurso, orden)
                             VALUES ($1, $2, $3, $4, $5, $6)
                             RETURNING id_material_curso`,
                            [id_clase, item.titulo, item.descripcion || null, item.urlRecurso || '',
                             item.tipoRecurso || 'documento', j + 1]
                        );
                        idsMatEnviados.push(matResult.rows[0].id_material_curso);
                        item.id = `mat_${matResult.rows[0].id_material_curso}`;
                    }
                }
            }

            // Limpiar evaluaciones/materiales huérfanos de esta clase
            if (idsEvalEnviadas.length > 0) {
                await client.query(
                    `DELETE FROM evaluaciones WHERE id_clase = $1 AND id_evaluacion != ALL($2::int[])`,
                    [id_clase, idsEvalEnviadas]
                );
            } else {
                await client.query(`DELETE FROM evaluaciones WHERE id_clase = $1`, [id_clase]);
            }

            if (idsMatEnviados.length > 0) {
                await client.query(
                    `DELETE FROM materiales_curso WHERE id_clase = $1 AND id_material_curso != ALL($2::int[])`,
                    [id_clase, idsMatEnviados]
                );
            } else {
                await client.query(`DELETE FROM materiales_curso WHERE id_clase = $1`, [id_clase]);
            }
        }

        await client.query('COMMIT');

        // Actualizar versión en el documento de respuesta
        doc.version = nuevaVersion;

        // Retornar el documento actualizado con IDs reales
        res.json({
            success: true,
            message: 'Documento del curso guardado exitosamente',
            data: doc,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, '[CursoController] Error al guardar documento del curso:');
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

// ============================================================
// POST /api/cursos/:id/material-upload
// Sube un archivo de material (imagen, video o documento) al curso.
// Requiere ser docente propietario del curso (o admin).
// ============================================================
export const subirMaterialCurso = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_curso = parseInt(req.params.id, 10);
        if (isNaN(id_curso)) {
            res.status(400).json({ success: false, message: 'ID de curso inválido' });
            return;
        }

        // Verificar ownership del curso
        if (!req.user || !(await verificarOwnershipCurso(id_curso, req.user))) {
            res.status(403).json({
                success: false,
                message: 'No tiene permiso para subir materiales a este curso',
            });
            return;
        }

        if (!req.file) {
            res.status(400).json({ success: false, message: 'Debe adjuntar un archivo' });
            return;
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const tipoRecurso = detectarTipoRecurso(ext);
        const urlRecurso = `/uploads/materiales/${req.file.filename}`;

        res.status(201).json({
            success: true,
            message: 'Material subido exitosamente',
            data: {
                urlRecurso,
                tipoRecurso,
                nombreOriginal: req.file.originalname,
                size: req.file.size,
            },
        });
    } catch (error: any) {
        logger.error({ err: error }, '[CursoController] Error al subir material:');
        res.status(500).json({ success: false, message: 'Error interno del servidor al subir el material' });
    }
};
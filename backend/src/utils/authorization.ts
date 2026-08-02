import { Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { AuthUser } from '../middleware/authMiddleware';

/**
 * Utilidades de autorización y ownership para la API.
 * Todas las funciones asumen que el usuario ya fue autenticado.
 */

type RoleMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export const normalizarRol = (rol?: string): string => {
    if (!rol) return '';
    const r = rol.toLowerCase();
    return r === 'administrador' ? 'admin' : r;
};

export const esAdmin = (rol?: string): boolean => normalizarRol(rol) === 'admin';
export const esDocente = (rol?: string): boolean => normalizarRol(rol) === 'docente';
export const esEstudiante = (rol?: string): boolean => normalizarRol(rol) === 'estudiante';

export const esDocenteOAdmin = (rol?: string): boolean => esAdmin(rol) || esDocente(rol);

/**
 * Verifica si el usuario autenticado puede actuar sobre otro usuario.
 * - Admin: puede actuar sobre cualquiera.
 * - Usuario normal: solo sobre sí mismo.
 */
export const puedeAdministrarUsuario = (
    reqUser: AuthUser,
    targetUserId: number
): boolean => {
    if (esAdmin(reqUser.rol)) return true;
    return reqUser.id_usuario === targetUserId;
};

/**
 * Obtiene el id_docente del curso al que pertenece una clase.
 */
export const obtenerDocenteDeClase = async (id_clase: number): Promise<number | null> => {
    const result = await query(
        `SELECT c.id_docente
         FROM clases cl
         JOIN cursos c ON c.id_curso = cl.id_curso
         WHERE cl.id_clase = $1`,
        [id_clase]
    );
    return result.rows.length > 0 ? result.rows[0].id_docente : null;
};

/**
 * Obtiene el id_docente del curso de una evaluación.
 */
export const obtenerDocenteDeEvaluacion = async (id_evaluacion: number): Promise<number | null> => {
    const result = await query(
        `SELECT c.id_docente
         FROM evaluaciones e
         JOIN clases cl ON cl.id_clase = e.id_clase
         JOIN cursos c ON c.id_curso = cl.id_curso
         WHERE e.id_evaluacion = $1`,
        [id_evaluacion]
    );
    return result.rows.length > 0 ? result.rows[0].id_docente : null;
};

/**
 * Obtiene el id_docente de un curso.
 */
export const obtenerDocenteDeCurso = async (id_curso: number): Promise<number | null> => {
    const result = await query(
        `SELECT id_docente FROM cursos WHERE id_curso = $1`,
        [id_curso]
    );
    return result.rows.length > 0 ? result.rows[0].id_docente : null;
};

/**
 * Verifica si el usuario puede administrar un recurso asociado a un curso.
 * - Admin: siempre.
 * - Docente: solo si es el id_docente del curso.
 * - Estudiante: nunca.
 */
export const verificarOwnershipCurso = async (
    id_curso: number,
    reqUser: AuthUser
): Promise<boolean> => {
    if (esAdmin(reqUser.rol)) return true;
    if (!esDocente(reqUser.rol)) return false;
    const idDocente = await obtenerDocenteDeCurso(id_curso);
    return idDocente !== null && idDocente === reqUser.id_usuario;
};

export const verificarOwnershipClase = async (
    id_clase: number,
    reqUser: AuthUser
): Promise<boolean> => {
    if (esAdmin(reqUser.rol)) return true;
    if (!esDocente(reqUser.rol)) return false;
    const idDocente = await obtenerDocenteDeClase(id_clase);
    return idDocente !== null && idDocente === reqUser.id_usuario;
};

export const verificarOwnershipEvaluacion = async (
    id_evaluacion: number,
    reqUser: AuthUser
): Promise<boolean> => {
    if (esAdmin(reqUser.rol)) return true;
    if (!esDocente(reqUser.rol)) return false;
    const idDocente = await obtenerDocenteDeEvaluacion(id_evaluacion);
    return idDocente !== null && idDocente === reqUser.id_usuario;
};

/**
 * Verifica ownership de un conjunto de clases para un docente.
 * Devuelve true si el usuario es admin o si es docente de todos los cursos.
 */
export const verificarOwnershipBatchClases = async (
    ids_clase: number[],
    reqUser: AuthUser
): Promise<boolean> => {
    const uniqueIds = [...new Set(ids_clase)];
    if (uniqueIds.length === 0) return true;
    if (esAdmin(reqUser.rol)) return true;
    if (!esDocente(reqUser.rol)) return false;
    const result = await query(
        `SELECT COUNT(DISTINCT c.id_docente) AS docentes_distintos,
                COUNT(DISTINCT cl.id_clase) AS clases_encontradas
         FROM clases cl
         JOIN cursos c ON c.id_curso = cl.id_curso
         WHERE cl.id_clase = ANY($1)`,
        [uniqueIds]
    );
    const row = result.rows[0];
    return (
        Number(row.clases_encontradas) === uniqueIds.length &&
        Number(row.docentes_distintos) === 1 &&
        Number((await query(
            `SELECT c.id_docente
             FROM clases cl
             JOIN cursos c ON c.id_curso = cl.id_curso
             WHERE cl.id_clase = $1
             LIMIT 1`,
            [uniqueIds[0]]
        )).rows[0]?.id_docente) === reqUser.id_usuario
    );
};

/**
 * Verifica si un estudiante está matriculado activamente en un curso.
 */
export const estaMatriculadoEnCurso = async (
    id_curso: number,
    id_estudiante: number
): Promise<boolean> => {
    const result = await query(
        `SELECT 1 FROM matriculas
         WHERE id_curso = $1 AND id_estudiante = $2 AND estado = 'activo'
         LIMIT 1`,
        [id_curso, id_estudiante]
    );
    return result.rows.length > 0;
};

/**
 * Verifica si un estudiante está matriculado activamente en el curso de una clase.
 */
export const estaMatriculadoEnClase = async (
    id_clase: number,
    id_estudiante: number
): Promise<boolean> => {
    const result = await query(
        `SELECT 1 FROM matriculas m
         JOIN clases cl ON cl.id_curso = m.id_curso
         WHERE cl.id_clase = $1 AND m.id_estudiante = $2 AND m.estado = 'activo'
         LIMIT 1`,
        [id_clase, id_estudiante]
    );
    return result.rows.length > 0;
};

/**
 * Verifica ownership de un conjunto de evaluaciones para un docente.
 */
export const verificarOwnershipBatchEvaluaciones = async (
    ids_evaluacion: number[],
    reqUser: AuthUser
): Promise<boolean> => {
    const uniqueIds = [...new Set(ids_evaluacion)];
    if (uniqueIds.length === 0) return true;
    if (esAdmin(reqUser.rol)) return true;
    if (!esDocente(reqUser.rol)) return false;
    const result = await query(
        `SELECT COUNT(DISTINCT c.id_docente) AS docentes_distintos,
                COUNT(DISTINCT e.id_evaluacion) AS evaluaciones_encontradas
         FROM evaluaciones e
         JOIN clases cl ON cl.id_clase = e.id_clase
         JOIN cursos c ON c.id_curso = cl.id_curso
         WHERE e.id_evaluacion = ANY($1)`,
        [uniqueIds]
    );
    const row = result.rows[0];
    if (Number(row.evaluaciones_encontradas) !== uniqueIds.length || Number(row.docentes_distintos) !== 1) {
        return false;
    }
    const ownerResult = await query(
        `SELECT c.id_docente
         FROM evaluaciones e
         JOIN clases cl ON cl.id_clase = e.id_clase
         JOIN cursos c ON c.id_curso = cl.id_curso
         WHERE e.id_evaluacion = $1
         LIMIT 1`,
        [uniqueIds[0]]
    );
    return Number(ownerResult.rows[0]?.id_docente) === reqUser.id_usuario;
};

// ─── Middlewares Express reutilizables ─────────────────────────

function esIdEnteroPositivo(valor: unknown): number | null {
    if (typeof valor !== 'string' && typeof valor !== 'number') return null;
    const str = String(valor).trim();
    if (!/^\d+$/.test(str)) return null;
    const num = parseInt(str, 10);
    return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Middleware: permite el acceso solo si el usuario es administrador
 * o es el propio usuario indicado en req.params.id.
 */
export const adminOPropioUsuario: RoleMiddleware = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
    }
    const targetId = esIdEnteroPositivo(req.params.id);
    if (targetId === null) {
        res.status(400).json({ success: false, message: 'ID de usuario inválido' });
        return;
    }
    if (puedeAdministrarUsuario(req.user, targetId)) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'No tiene permiso para acceder a este usuario' });
};

/**
 * Middleware: permite el acceso solo si el usuario es administrador
 * o es el mismo usuario indicado en req.body.id_usuario.
 */
export const adminOPropioUsuarioBody: RoleMiddleware = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
    }
    const targetId = esIdEnteroPositivo(req.body.id_usuario);
    if (targetId === null) {
        res.status(400).json({ success: false, message: 'id_usuario inválido' });
        return;
    }
    if (puedeAdministrarUsuario(req.user, targetId)) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'No tiene permiso para registrar documentos de otro usuario' });
};

/**
 * Middleware: permite acceso solo si el usuario es admin/docente dueño del curso.
 */
export const requireCursoOwner: RoleMiddleware = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
    }
    const id_curso = esIdEnteroPositivo(req.params.id);
    if (id_curso === null) {
        res.status(400).json({ success: false, message: 'ID de curso inválido' });
        return;
    }
    if (esAdmin(req.user.rol) || (esDocente(req.user.rol) && await verificarOwnershipCurso(id_curso, req.user))) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'No tiene permiso para acceder a este curso' });
};

/**
 * Middleware: permite acceso si el usuario es admin/docente dueño del curso
 * o un estudiante matriculado en el curso.
 */
export const requireCursoAccess: RoleMiddleware = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
    }
    const id_curso = esIdEnteroPositivo(req.params.id);
    if (id_curso === null) {
        res.status(400).json({ success: false, message: 'ID de curso inválido' });
        return;
    }
    if (esAdmin(req.user.rol) || (esDocente(req.user.rol) && await verificarOwnershipCurso(id_curso, req.user))) {
        next();
        return;
    }
    if (esEstudiante(req.user.rol) && await estaMatriculadoEnCurso(id_curso, req.user.id_usuario)) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'No tiene permiso para acceder a este curso' });
};

/**
 * Middleware: permite acceso solo si el usuario es admin/docente dueño del curso de la clase.
 */
export const requireClaseOwner: RoleMiddleware = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
    }
    const id_clase = esIdEnteroPositivo(req.params.id);
    if (id_clase === null) {
        res.status(400).json({ success: false, message: 'ID de clase inválido' });
        return;
    }
    if (esAdmin(req.user.rol) || (esDocente(req.user.rol) && await verificarOwnershipClase(id_clase, req.user))) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'No tiene permiso para acceder a esta clase' });
};

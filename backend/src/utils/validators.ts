import { z } from 'zod';

// ============================================================
// Validadores Zod para los controladores
// ============================================================

// ─── Usuarios ──────────────────────────────────────────

export const crearUsuarioSchema = z.object({
    nombre_completo: z.string().min(2).max(255),
    cedula: z.string().min(1).max(20),
    email: z.string().email().max(255),
    password: z.string().min(4).max(100),
    rol: z.enum(['Administrador', 'administrador', 'admin', 'Docente', 'docente', 'Estudiante', 'estudiante']),
    tipo_discapacidad: z.string().max(100).optional().nullable(),
    foto_url: z.string().max(500).optional().nullable(),
    descripcion: z.string().max(500).optional().nullable(),
    edad: z.number().int().min(0).max(150).optional().nullable(),
    direccion: z.string().max(500).optional().nullable(),
    genero: z.enum(['masculino', 'femenino', 'otro']).optional().nullable(),
});

export const actualizarUsuarioSchema = crearUsuarioSchema.partial();

export const listarUsuariosQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    rol: z.string().optional(),
    search: z.string().max(100).optional(),
});

// ─── Cursos ────────────────────────────────────────────

export const crearCursoSchema = z.object({
    id_docente: z.number().int().positive(),
    nombre: z.string().min(2).max(255),
    descripcion: z.string().max(2000).optional().nullable(),
});

export const listarCursosQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Clases ────────────────────────────────────────────

export const crearClaseSchema = z.object({
    id_curso: z.number().int().positive(),
    titulo: z.string().min(2).max(255),
    tipo_discapacidad: z.string().max(100).optional().nullable(),
    fecha: z.string().optional().nullable(),
    enlace_recurso: z.string().max(2000).optional().nullable(),
});

// ─── Quizzes ───────────────────────────────────────────

export const guardarQuizSchema = z.object({
    titulo: z.string().min(1).max(255),
    descripcion: z.string().max(2000).optional().nullable(),
    tiempo_limite_min: z.number().int().min(1).max(480).optional().nullable(),
    activo: z.boolean().optional(),
    preguntas: z.array(z.object({
        enunciado: z.string().min(1).max(2000),
        tipo: z.enum(['opcion_multiple', 'verdadero_falso']).default('opcion_multiple'),
        opciones: z.array(z.object({
            texto: z.string().min(1).max(500),
            es_correcta: z.boolean(),
        })).min(2),
    })).min(1),
});

// ─── Evaluaciones ──────────────────────────────────────

export const crearEvaluacionSchema = z.object({
    id_clase: z.number().int().positive(),
    titulo_evaluacion: z.string().min(2).max(255),
    porcentaje: z.number().min(0).max(100),
});

export const guardarCalificacionSchema = z.object({
    id_estudiante: z.number().int().positive(),
    nota_preliminar: z.number().min(0).max(20).optional().nullable(),
    nota_definitiva: z.number().min(0).max(20).optional().nullable(),
    observaciones: z.string().max(1000).optional().nullable(),
});

// ─── Asistencia ────────────────────────────────────────

export const registrarAsistenciaSchema = z.object({
    id_estudiante: z.number().int().positive(),
    estado: z.enum(['presente', 'ausente', 'justificado']),
});

export const syncAsistenciaSchema = registrarAsistenciaSchema.extend({
    id_sesion: z.number().int().positive(),
    id_clase: z.number().int().positive(),
});

export const syncPayloadSchema = z.object({
    asistencias: z.array(syncAsistenciaSchema).default([]),
    calificaciones: z.array(z.object({
        id_evaluacion: z.number().int().positive(),
        id_estudiante: z.number().int().positive(),
        nota_preliminar: z.number().min(0).max(20).optional().nullable(),
        observaciones: z.string().max(500).optional(),
    })).default([]),
});

// ─── Reportes ──────────────────────────────────────────

export const reporteRendimientoParams = z.object({
    id_curso: z.coerce.number().int().positive(),
});

// ─── Entregas ──────────────────────────────────────────

export const crearEntregaSchema = z.object({
    id_evaluacion: z.number().int().positive(),
    id_estudiante: z.number().int().positive(),
    tipo_entrega: z.enum(['PDF', 'WORD', 'URL']),
    url_enlace: z.string().max(2000).optional(),
});

// ─── Documentos ────────────────────────────────────────

export const crearDocumentoSchema = z.object({
    id_usuario: z.number().int().positive(),
    tipo_documento: z.string().min(1).max(100),
    numero_identificacion: z.string().min(1).max(100),
});

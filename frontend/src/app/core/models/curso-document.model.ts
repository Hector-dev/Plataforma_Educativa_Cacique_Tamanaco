// ============================================================
// Modelos para el Editor Visual de Cursos (Canvas)
// ============================================================

// --- Tipos de ítems del canvas ---

export type CursoItemType = 'tarea' | 'material' | 'evaluacion' | 'quiz';

export type TipoRecurso = 'video' | 'documento' | 'enlace' | 'imagen';

export type FormatoPermitido = 'PDF' | 'WORD' | 'URL';

// --- Ítems hijos dentro de una lección ---

export interface CursoItemBase {
  id: string;          // 'tar_xxx', 'mat_xxx', 'eva_xxx'
  titulo: string;
  descripcion: string;
  orden: number;
}

export interface TareaItem extends CursoItemBase {
  tipo: 'tarea';
  formatosPermitidos: FormatoPermitido[];
  fechaLimite: string | null;
}

export interface MaterialItem extends CursoItemBase {
  tipo: 'material';
  urlRecurso: string;
  tipoRecurso: TipoRecurso;
}

export interface EvaluacionItem extends CursoItemBase {
  tipo: 'evaluacion';
  porcentaje: number; // 0-100
}

export interface QuizItem extends CursoItemBase {
  tipo: 'quiz';
  porcentaje: number; // 0-100
  tieneQuiz: boolean;  // flag para saber si ya se creó el quiz en BD
}

export type CursoItem = TareaItem | MaterialItem | EvaluacionItem | QuizItem;

// --- Lección (clase dentro del curso) ---

export interface Leccion {
  id: string;                // 'lec_xxx'
  titulo: string;
  descripcion: string;
  tipoDiscapacidad: string | null;
  fecha: string | null;      // ISO 8601
  enlaceRecurso: string | null;
  duracionMinutos: number | null;
  orden: number;
  items: CursoItem[];        // Evaluaciones + Materiales anidados
}

// --- Módulo (agrupación de lecciones) ---

export interface Modulo {
  id: string;                // 'mod_xxx'
  titulo: string;
  descripcion: string;
  orden: number;
  lecciones: Leccion[];
}

// --- Documento completo del curso ---

export interface CursoDocument {
  id: string;                // 'c_xxx'
  nombre: string;
  descripcion: string;
  id_docente: number;
  version: number;
  updatedAt: string;         // ISO 8601
  modulos: Modulo[];
  leccionesSueltas: Leccion[];  // Lecciones sin módulo
}

// ============================================================
// Fábricas de objetos por defecto
// ============================================================

export function crearModuloVacio(orden: number): Modulo {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `mod_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: 'Nuevo Módulo',
    descripcion: '',
    orden,
    lecciones: [],
  };
}

export function crearLeccionVacia(orden: number): Leccion {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `lec_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: 'Nueva Clase',
    descripcion: '',
    tipoDiscapacidad: null,
    fecha: new Date().toISOString(),
    enlaceRecurso: null,
    duracionMinutos: 45,
    orden,
    items: [],
  };
}

export function crearTareaVacia(orden: number): TareaItem {
  return {
    tipo: 'tarea',
    id: crypto.randomUUID ? crypto.randomUUID() : `tar_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: 'Nueva Tarea',
    descripcion: '',
    formatosPermitidos: ['PDF'],
    fechaLimite: null,
    orden,
  };
}

export function crearMaterialVacio(orden: number): MaterialItem {
  return {
    tipo: 'material',
    id: crypto.randomUUID ? crypto.randomUUID() : `mat_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: 'Nuevo Material',
    descripcion: '',
    urlRecurso: '',
    tipoRecurso: 'documento',
    orden,
  };
}

export function crearEvaluacionVacia(orden: number): EvaluacionItem {
  return {
    tipo: 'evaluacion',
    id: crypto.randomUUID ? crypto.randomUUID() : `eva_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: 'Nueva Evaluación',
    descripcion: '',
    porcentaje: 10,
    orden,
  };
}

export function crearQuizVacio(orden: number): QuizItem {
  return {
    tipo: 'quiz',
    id: crypto.randomUUID ? crypto.randomUUID() : `qz_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: 'Nuevo Quiz',
    descripcion: '',
    porcentaje: 10,
    tieneQuiz: false,
    orden,
  };
}

// ============================================================
// CourseEditorStore — Estado central del Editor Visual Canvas
// Usa Signals + immer para manejo inmutable + undo/redo
// ============================================================

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { produce } from 'immer';
import { environment } from '../../../environments/environment';
import {
  CursoDocument,
  Modulo,
  Leccion,
  CursoItem,
  crearModuloVacio,
  crearLeccionVacia,
  crearTareaVacia,
  crearMaterialVacio,
  crearEvaluacionVacia,
  crearQuizVacio,
} from '../models/curso-document.model';

// ─── Tipos internos ───────────────────────────────────────────

export type ElementoSeleccionado =
  | { tipo: 'modulo'; moduloId: string }
  | { tipo: 'leccion'; leccionId: string; moduloId: string | null }
  | { tipo: 'item'; itemId: string; leccionId: string; moduloId: string | null }
  | null;

// ─── Servicio ────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CourseEditorStoreService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ── Estado principal ────────────────────────────────────────

  readonly documento = signal<CursoDocument | null>(null);
  readonly seleccion = signal<ElementoSeleccionado>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly tieneCambios = signal(false);
  readonly error = signal<string | null>(null);

  // ── Undo / Redo (snapshots completos) ────────────────────────

  private readonly MAX_UNDO = 50;
  private undoStack: CursoDocument[] = [];
  private redoStack: CursoDocument[] = [];

  readonly puedeDeshacer = computed(() => this.undoStack.length > 0);
  readonly puedeRehacer = computed(() => this.redoStack.length > 0);

  // ── Computed ─────────────────────────────────────────────────

  /** Elemento seleccionado resuelto a sus datos reales (para el inspector) */
  readonly elementoSeleccionado = computed(() => {
    const sel = this.seleccion();
    const doc = this.documento();
    if (!sel || !doc) return null;

    if (sel.tipo === 'modulo') {
      const modulo = doc.modulos.find(m => m.id === sel.moduloId);
      return modulo ? { tipo: 'modulo' as const, datos: modulo } : null;
    }
    if (sel.tipo === 'leccion') {
      if (sel.moduloId) {
        const modulo = doc.modulos.find(m => m.id === sel.moduloId);
        const leccion = modulo?.lecciones.find(l => l.id === sel.leccionId);
        return leccion ? { tipo: 'leccion' as const, datos: leccion } : null;
      }
      const leccion = doc.leccionesSueltas.find(l => l.id === sel.leccionId);
      return leccion ? { tipo: 'leccion' as const, datos: leccion } : null;
    }
    if (sel.tipo === 'item') {
      const leccion = this.encontrarLeccion(doc, sel.leccionId, sel.moduloId);
      const item = leccion?.items.find(i => i.id === sel.itemId);
      return item ? { tipo: 'item' as const, datos: item } : null;
    }
    return null;
  });

  // ── Acciones: carga / guardado ───────────────────────────────

  cargarCurso(idCurso: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.http.get<{ success: boolean; data: CursoDocument }>(
      `${this.apiUrl}/cursos/${idCurso}/document`
    ).subscribe({
      next: (res) => {
        this.documento.set(res.data);
        this.cargando.set(false);
        this.tieneCambios.set(false);
        this.undoStack = [];
        this.redoStack = [];
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar el curso');
        this.cargando.set(false);
      },
    });
  }

  guardarCurso(): void {
    const doc = this.documento();
    if (!doc) return;

    this.guardando.set(true);
    const idCurso = parseInt(doc.id.replace('c_', ''), 10);

    this.http.put<{ success: boolean; data: CursoDocument }>(
      `${this.apiUrl}/cursos/${idCurso}/document`,
      doc
    ).subscribe({
      next: (res) => {
        this.documento.set(res.data);
        this.guardando.set(false);
        this.tieneCambios.set(false);
        this.undoStack = [];
        this.redoStack = [];
      },
      error: (err) => {
        if (err.status === 409) {
          // Conflicto de versión: el curso fue modificado en otro lugar
          this.error.set(
            '⚠️ Conflicto de edición: el curso fue modificado por otra persona. ' +
            'Recarga la página para obtener la última versión.'
          );
        } else {
          this.error.set(err.error?.message || 'Error al guardar el curso');
        }
        this.guardando.set(false);
      },
    });
  }

  // ── Acciones: selección ──────────────────────────────────────

  seleccionarElemento(elemento: ElementoSeleccionado): void {
    this.seleccion.set(elemento);
  }

  deseleccionar(): void {
    this.seleccion.set(null);
  }

  // ── Acciones: modificar documento (con undo/redo) ─────────━━

  private mutar(recipe: (draft: CursoDocument) => void): void {
    const doc = this.documento();
    if (!doc) return;

    // Guardar snapshot actual para undo (con límite máximo)
    this.undoStack.push(doc);
    if (this.undoStack.length > this.MAX_UNDO) {
      this.undoStack.shift(); // Eliminar el más antiguo
    }
    this.redoStack = [];

    const nextState = produce(doc, recipe);
    this.documento.set(nextState);
    this.tieneCambios.set(true);
  }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;

    const current = this.documento();
    if (current) this.redoStack.push(current);

    this.documento.set(prev);
    this.tieneCambios.set(this.undoStack.length > 0);
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;

    const current = this.documento();
    if (current) this.undoStack.push(current);

    this.documento.set(next);
    this.tieneCambios.set(true);
  }

  // ── Acciones: CRUD de módulos ────────────────────────────────

  agregarModulo(): void {
    this.mutar(draft => {
      const nuevo = crearModuloVacio(draft.modulos.length + 1);
      draft.modulos.push(nuevo);
    });
  }

  actualizarModulo(moduloId: string, cambios: Partial<Modulo>): void {
    this.mutar(draft => {
      const idx = draft.modulos.findIndex(m => m.id === moduloId);
      if (idx >= 0) Object.assign(draft.modulos[idx], cambios);
    });
  }

  eliminarModulo(moduloId: string): void {
    this.mutar(draft => {
      draft.modulos = draft.modulos.filter(m => m.id !== moduloId);
    });
    this.seleccion.set(null);
  }

  moverModulo(moduloId: string, nuevoIndice: number): void {
    this.mutar(draft => {
      const idx = draft.modulos.findIndex(m => m.id === moduloId);
      if (idx < 0) return;
      const [mod] = draft.modulos.splice(idx, 1);
      draft.modulos.splice(nuevoIndice, 0, mod);
      draft.modulos.forEach((m, i) => m.orden = i + 1);
    });
  }

  // ── Acciones: CRUD de lecciones ──────────────────────────────

  agregarLeccion(moduloId: string | null): void {
    this.mutar(draft => {
      const orden = moduloId
        ? ((draft.modulos.find(m => m.id === moduloId)?.lecciones.length || 0) + 1)
        : (draft.leccionesSueltas.length + 1);
      const nueva = crearLeccionVacia(orden);

      if (moduloId) {
        const modulo = draft.modulos.find(m => m.id === moduloId);
        modulo?.lecciones.push(nueva);
      } else {
        draft.leccionesSueltas.push(nueva);
      }
    });
  }

  actualizarLeccion(leccionId: string, moduloId: string | null, cambios: Partial<Leccion>): void {
    this.mutar(draft => {
      const leccion = this.encontrarLeccion(draft, leccionId, moduloId);
      if (leccion) Object.assign(leccion, cambios);
    });
  }

  eliminarLeccion(leccionId: string, moduloId: string | null): void {
    this.mutar(draft => {
      if (moduloId) {
        const modulo = draft.modulos.find(m => m.id === moduloId);
        if (modulo) modulo.lecciones = modulo.lecciones.filter(l => l.id !== leccionId);
      } else {
        draft.leccionesSueltas = draft.leccionesSueltas.filter(l => l.id !== leccionId);
      }
    });
    this.seleccion.set(null);
  }

  moverLeccion(leccionId: string, origenModuloId: string | null, destinoModuloId: string | null, nuevoIndice: number): void {
    this.mutar(draft => {
      let leccion: Leccion | undefined;
      if (origenModuloId) {
        const mod = draft.modulos.find(m => m.id === origenModuloId);
        const idx = mod?.lecciones.findIndex(l => l.id === leccionId) ?? -1;
        if (idx >= 0) [leccion] = mod!.lecciones.splice(idx, 1);
      } else {
        const idx = draft.leccionesSueltas.findIndex(l => l.id === leccionId);
        if (idx >= 0) [leccion] = draft.leccionesSueltas.splice(idx, 1);
      }
      if (!leccion) return;

      if (destinoModuloId) {
        const mod = draft.modulos.find(m => m.id === destinoModuloId);
        mod?.lecciones.splice(nuevoIndice, 0, leccion);
        mod?.lecciones.forEach((l, i) => l.orden = i + 1);
      } else {
        draft.leccionesSueltas.splice(nuevoIndice, 0, leccion);
        draft.leccionesSueltas.forEach((l, i) => l.orden = i + 1);
      }
    });
  }

  // ── Acciones: CRUD de ítems dentro de lecciones ──────────────

  agregarItem(leccionId: string, moduloId: string | null, tipo: 'tarea' | 'material' | 'evaluacion' | 'quiz'): void {
    this.mutar(draft => {
      const leccion = this.encontrarLeccion(draft, leccionId, moduloId);
      if (!leccion) return;

      const orden = leccion.items.length + 1;
      let nuevoItem: CursoItem;
      switch (tipo) {
        case 'tarea': nuevoItem = crearTareaVacia(orden); break;
        case 'material': nuevoItem = crearMaterialVacio(orden); break;
        case 'evaluacion': nuevoItem = crearEvaluacionVacia(orden); break;
        case 'quiz': nuevoItem = crearQuizVacio(orden); break;
      }
      leccion.items.push(nuevoItem);
    });
  }

  actualizarItem(leccionId: string, moduloId: string | null, itemId: string, cambios: Partial<CursoItem>): void {
    this.mutar(draft => {
      const leccion = this.encontrarLeccion(draft, leccionId, moduloId);
      const item = leccion?.items.find(i => i.id === itemId);
      if (item) Object.assign(item, cambios);
    });
  }

  eliminarItem(leccionId: string, moduloId: string | null, itemId: string): void {
    this.mutar(draft => {
      const leccion = this.encontrarLeccion(draft, leccionId, moduloId);
      if (leccion) leccion.items = leccion.items.filter(i => i.id !== itemId);
    });
    this.seleccion.set(null);
  }

  moverItem(itemId: string, origenLeccionId: string, origenModuloId: string | null, destinoLeccionId: string, destinoModuloId: string | null, nuevoIndice: number): void {
    this.mutar(draft => {
      const origenLeccion = this.encontrarLeccion(draft, origenLeccionId, origenModuloId);
      const itemIdx = origenLeccion?.items.findIndex(i => i.id === itemId) ?? -1;
      if (itemIdx < 0) return;
      const [item] = origenLeccion!.items.splice(itemIdx, 1);

      const destinoLeccion = this.encontrarLeccion(draft, destinoLeccionId, destinoModuloId);
      destinoLeccion?.items.splice(nuevoIndice, 0, item);
      destinoLeccion?.items.forEach((it, i) => it.orden = i + 1);
      origenLeccion?.items.forEach((it, i) => it.orden = i + 1);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  private encontrarLeccion(doc: CursoDocument, leccionId: string, moduloId: string | null): Leccion | undefined {
    if (moduloId) {
      return doc.modulos.find(m => m.id === moduloId)?.lecciones.find(l => l.id === leccionId);
    }
    return doc.leccionesSueltas.find(l => l.id === leccionId);
  }
}

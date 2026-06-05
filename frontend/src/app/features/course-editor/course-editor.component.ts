// ============================================================
// CourseEditorComponent — Editor Visual de Cursos Canvas
// Layout: Sidebar | Canvas | Inspector
// ============================================================

import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { environment } from '../../../environments/environment';

import { CourseEditorStoreService, ElementoSeleccionado } from '../../core/services/course-editor-store.service';
import {
  CursoDocument,
  Modulo,
  Leccion,
  CursoItem,
  CursoItemType,
} from '../../core/models/curso-document.model';

// ─── Interfaz para secciones colapsables ──────────────────────

interface CollapseState {
  modulos: Record<string, boolean>;
  lecciones: Record<string, boolean>;
}

@Component({
  selector: 'app-course-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CdkDropList, CdkDropListGroup],
  templateUrl: './course-editor.component.html',
  styleUrls: ['./course-editor.component.scss'],
})
export class CourseEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  readonly store = inject(CourseEditorStoreService);

  // ── Estado local ────────────────────────────────────────────

  /** IDs de módulos/lecciones colapsados */
  readonly collapse = signal<CollapseState>({ modulos: {}, lecciones: {} });

  /** Elemento en edición inline: { tipo, id, campo } */
  readonly editando = signal<{ tipo: string; id: string; campo: string } | null>(null);

  /** Inspector abierto */
  readonly inspectorAbierto = signal(true);

  /** Tema oscuro / claro */
  readonly isDark = signal(true);

  // ── Quiz Editor ─────────────────────────────────────────────

  readonly quizEditorOpen = signal(false);
  readonly quizEditEvaluacionId = signal<number | null>(null);
  readonly quizEditLoading = signal(false);
  readonly quizEditSaving = signal(false);

  // Preguntas del quiz (cargadas desde API)
  quizEditPreguntas: any[] = [];

  // Formulario para editar una pregunta
  quizEditQuestionIndex: number | null = null; // null = nueva
  quizEditFormEnunciado = '';
  quizEditFormTipo: 'opcion_multiple' | 'verdadero_falso' = 'opcion_multiple';
  quizEditFormOpciones: { texto: string; es_correcta: boolean }[] = [];

  // ── Computed ─────────────────────────────────────────────────

  readonly documento = this.store.documento;
  readonly seleccion = this.store.seleccion;
  readonly cargando = this.store.cargando;
  readonly guardando = this.store.guardando;
  readonly tieneCambios = this.store.tieneCambios;
  readonly error = this.store.error;

  // ── Lifecycle ────────────────────────────────────────────────

  ngOnInit(): void {
    // Cargar tema guardado
    const saved = localStorage.getItem('cactam_theme');
    this.isDark.set(saved !== 'light');

    const idCurso = this.route.snapshot.paramMap.get('id');
    if (idCurso) {
      this.store.cargarCurso(parseInt(idCurso, 10));
    }
  }

  // ── Tema ─────────────────────────────────────────────────────

  toggleTheme(): void {
    const nuevoValor = !this.isDark();
    this.isDark.set(nuevoValor);
    if (nuevoValor) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('cactam_theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('cactam_theme', 'light');
    }
  }

  // ── Atajos de teclado ───────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (!isCtrlOrCmd) return;

    switch (event.key.toLowerCase()) {
      case 's':
        event.preventDefault();
        if (this.tieneCambios() && !this.guardando()) {
          this.guardar();
        }
        break;
      case 'z':
        if (event.shiftKey) {
          event.preventDefault();
          this.rehacer();
        } else {
          event.preventDefault();
          this.deshacer();
        }
        break;
      case 'y':
        event.preventDefault();
        this.rehacer();
        break;
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.tieneCambios()) {
      event.preventDefault();
      // El mensaje es controlado por el navegador
    }
  }

  // ── Acciones globales ────────────────────────────────────────

  guardar(): void { this.store.guardarCurso(); }
  deshacer(): void { this.store.undo(); }
  rehacer(): void { this.store.redo(); }

  // ── Drag & Drop ──────────────────────────────────────────────

  /** IDs de drop lists conectadas dinámicamente */
  getConnectedLists(tipo: string): string[] {
    switch (tipo) {
      case 'modulo':
        return ['canvas-root'];
      case 'leccion':
        return ['canvas-root'];
      case 'item':
        return [];
      default:
        return [];
    }
  }

  dropEnCanvas(event: CdkDragDrop<any[]>): void {
    if (event.previousContainer === event.container) {
      const doc = this.documento();
      if (!doc) return;
      this.store.moverModulo(doc.modulos[event.previousIndex].id, event.currentIndex);
    }
  }

  dropEnModulo(event: CdkDragDrop<any[]>, moduloId: string): void {
    if (event.previousContainer === event.container) {
      this.store.moverLeccion(event.item.data, moduloId, moduloId, event.currentIndex);
    } else {
      this.store.moverLeccion(event.item.data, null, moduloId, event.currentIndex);
    }
  }

  dropEnLeccion(event: CdkDragDrop<any[]>, leccionId: string, moduloId: string | null): void {
    if (event.previousContainer === event.container) {
      // Reordenar ítems dentro de la misma lección
    } else {
      this.store.moverItem(event.item.data, leccionId, moduloId, leccionId, moduloId, event.currentIndex);
    }
  }

  // ── Acciones CRUD ────────────────────────────────────────────

  agregarModulo(): void { this.store.agregarModulo(); }
  eliminarModulo(id: string): void { this.store.eliminarModulo(id); }

  agregarLeccion(moduloId: string | null): void { this.store.agregarLeccion(moduloId); }
  eliminarLeccion(leccionId: string, moduloId: string | null): void {
    this.store.eliminarLeccion(leccionId, moduloId);
  }

  agregarItem(leccionId: string, moduloId: string | null, tipo: CursoItemType): void {
    this.store.agregarItem(leccionId, moduloId, tipo);
  }
  eliminarItem(leccionId: string, moduloId: string | null, itemId: string): void {
    this.store.eliminarItem(leccionId, moduloId, itemId);
  }

  // ── Selección ────────────────────────────────────────────

  seleccionarModulo(moduloId: string): void {
    this.store.seleccionarElemento({ tipo: 'modulo', moduloId });
  }

  seleccionarLeccion(leccionId: string, moduloId: string | null): void {
    this.store.seleccionarElemento({ tipo: 'leccion', leccionId, moduloId });
  }

  seleccionarItem(itemId: string, leccionId: string, moduloId: string | null): void {
    this.store.seleccionarElemento({ tipo: 'item', itemId, leccionId, moduloId });
  }

  // ── Edición inline ───────────────────────────────────────

  iniciarEdicion(tipo: string, id: string, campo: string): void {
    this.editando.set({ tipo, id, campo });
  }

  finalizarEdicion(): void {
    this.editando.set(null);
  }

  guardarEdicionInline(valor: string, tipo: string, id: string, campo: string, moduloId?: string | null, leccionId?: string): void {
    const cambios: any = { [campo]: valor };

    switch (tipo) {
      case 'modulo':
        this.store.actualizarModulo(id, cambios);
        break;
      case 'leccion':
        this.store.actualizarLeccion(id, moduloId || null, cambios);
        break;
      case 'item':
        if (leccionId) {
          this.store.actualizarItem(leccionId, moduloId || null, id, cambios);
        }
        break;
    }
    this.editando.set(null);
  }

  estaEditando(tipo: string, id: string, campo: string): boolean {
    const ed = this.editando();
    return ed?.tipo === tipo && ed?.id === id && ed?.campo === campo;
  }

  // ── Colapsar/expandir ────────────────────────────────────

  toggleModulo(moduloId: string): void {
    this.collapse.update(c => ({
      ...c,
      modulos: { ...c.modulos, [moduloId]: !c.modulos[moduloId] },
    }));
  }

  toggleLeccion(leccionId: string): void {
    this.collapse.update(c => ({
      ...c,
      lecciones: { ...c.lecciones, [leccionId]: !c.lecciones[leccionId] },
    }));
  }

  isModuloCollapsed(id: string): boolean {
    return !!this.collapse().modulos[id];
  }

  isLeccionCollapsed(id: string): boolean {
    return !!this.collapse().lecciones[id];
  }

  // ── Helpers ──────────────────────────────────────────────

  getIconoItem(tipo: string): string {
    switch (tipo) {
      case 'tarea': return '📝';
      case 'material': return '📎';
      case 'evaluacion': return '📋';
      case 'quiz': return '🎯';
      default: return '📄';
    }
  }

  getColorItem(tipo: string): string {
    switch (tipo) {
      case 'tarea': return '#F59E0B';
      case 'material': return '#3B82F6';
      case 'evaluacion': return '#8B5CF6';
      case 'quiz': return '#EC4899';
      default: return '#6B7280';
    }
  }

  contarLecciones(doc: CursoDocument): number {
    let total = doc.leccionesSueltas.length;
    for (const mod of doc.modulos) {
      total += mod.lecciones.length;
    }
    return total;
  }

  actualizarPropiedad(elem: any, campo: string, valor: any): void {
    const sel = this.seleccion();
    if (!sel || !elem) return;

    const cambios: any = { [campo]: valor };

    if (sel.tipo === 'modulo') {
      this.store.actualizarModulo(sel.moduloId, cambios);
    } else if (sel.tipo === 'leccion') {
      this.store.actualizarLeccion(sel.leccionId, sel.moduloId || null, cambios);
    } else if (sel.tipo === 'item') {
      this.store.actualizarItem(sel.leccionId, sel.moduloId || null, sel.itemId, cambios);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // QUIZ EDITOR
  // ═══════════════════════════════════════════════════════════

  /** Obtener el id_evaluacion real desde el ID del ítem (eva_123 → 123) */
  private extractEvalId(itemId: string): number | null {
    const match = itemId.match(/^eva_(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  abrirEditorQuizDesdeSeleccion(): void {
    const sel = this.seleccion();
    if (sel?.tipo === 'item') {
      this.abrirEditorQuiz(sel.itemId, sel.leccionId, sel.moduloId);
    }
  }

  abrirEditorQuiz(itemId: string, leccionId: string, moduloId: string | null): void {
    const evalId = this.extractEvalId(itemId);
    if (!evalId) {
      alert('Primero guarda el curso para poder editar las preguntas del quiz.');
      return;
    }

    this.quizEditEvaluacionId.set(evalId);
    this.quizEditorOpen.set(true);
    this.quizEditLoading.set(true);
    this.quizEditPreguntas = [];

    this.http.get<{ success: boolean; data: any }>(
      `${this.apiUrl}/quizzes/evaluacion/${evalId}`
    ).subscribe({
      next: (res) => {
        this.quizEditLoading.set(false);
        if (res.success && res.data && res.data.preguntas) {
          this.quizEditPreguntas = res.data.preguntas.map((p: any) => ({
            id: p.id,
            enunciado: p.enunciado,
            tipo: p.tipo,
            opciones: p.opciones.map((o: any) => ({
              texto: o.texto,
              es_correcta: (o as any).es_correcta === true,
            }))
          }));
        } else {
          this.quizEditPreguntas = [];
        }
      },
      error: (err) => {
        this.quizEditLoading.set(false);
        if (err.status === 404) {
          this.quizEditPreguntas = [];
        } else {
          alert('Error al cargar el quiz');
          this.quizEditorOpen.set(false);
        }
      }
    });
  }

  cerrarEditorQuiz(): void {
    this.quizEditorOpen.set(false);
    this.quizEditEvaluacionId.set(null);
    this.quizEditPreguntas = [];
    this.quizEditQuestionIndex = null;
  }

  // ── Gestión de preguntas ──────────────────────────────────

  quizNuevaPregunta(): void {
    this.quizEditQuestionIndex = null;
    this.quizEditFormEnunciado = '';
    this.quizEditFormTipo = 'opcion_multiple';
    this.quizEditFormOpciones = [
      { texto: '', es_correcta: false },
      { texto: '', es_correcta: false },
    ];
  }

  quizEditarPregunta(index: number): void {
    const q = this.quizEditPreguntas[index];
    this.quizEditQuestionIndex = index;
    this.quizEditFormEnunciado = q.enunciado;
    this.quizEditFormTipo = q.tipo;
    this.quizEditFormOpciones = q.opciones.map((o: any) => ({ ...o }));
  }

  quizCancelarEditarPregunta(): void {
    this.quizEditQuestionIndex = -2; // -2 = no editing
  }

  quizAgregarOpcion(): void {
    this.quizEditFormOpciones.push({ texto: '', es_correcta: false });
  }

  quizEliminarOpcion(index: number): void {
    if (this.quizEditFormOpciones.length <= 2) return;
    this.quizEditFormOpciones.splice(index, 1);
  }

  quizGuardarPregunta(): void {
    if (!this.quizEditFormEnunciado.trim()) return;

    const pregunta = {
      enunciado: this.quizEditFormEnunciado.trim(),
      tipo: this.quizEditFormTipo,
      opciones: this.quizEditFormOpciones.map(o => ({
        texto: o.texto,
        es_correcta: o.es_correcta,
      })),
    };

    if (this.quizEditQuestionIndex === null) {
      // Nueva pregunta
      this.quizEditPreguntas.push(pregunta);
    } else if (this.quizEditQuestionIndex >= 0) {
      // Editar existente
      this.quizEditPreguntas[this.quizEditQuestionIndex] = pregunta;
    }

    this.quizEditQuestionIndex = -2;
  }

  quizEliminarPregunta(index: number): void {
    if (confirm('¿Eliminar esta pregunta?')) {
      this.quizEditPreguntas.splice(index, 1);
    }
  }

  // ── Guardar quiz completo ─────────────────────────────────

  quizGuardarTodo(): void {
    const evalId = this.quizEditEvaluacionId();
    if (!evalId) return;

    this.quizEditSaving.set(true);
    this.http.put(`${this.apiUrl}/quizzes/evaluacion/${evalId}`, {
      titulo: 'Quiz',
      preguntas: this.quizEditPreguntas,
      activo: true,
    }).subscribe({
      next: () => {
        this.quizEditSaving.set(false);
        this.cerrarEditorQuiz();
        // Marcamos tieneQuiz=true en el item del canvas
        const sel = this.seleccion();
        if (sel?.tipo === 'item') {
          this.store.actualizarItem(sel.leccionId, sel.moduloId || null, sel.itemId, { tieneQuiz: true } as any);
        }
      },
      error: (err) => {
        this.quizEditSaving.set(false);
        alert(err.error?.message || 'Error al guardar el quiz');
      }
    });
  }
}

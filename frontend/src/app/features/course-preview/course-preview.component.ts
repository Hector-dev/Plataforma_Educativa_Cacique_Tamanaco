import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LessonCardComponent } from './lesson-card.component';

interface Estudiante {
  id_usuario: number;
  nombre_completo: string;
  cedula: string;
}

interface CalificacionFila {
  id_estudiante: number;
  nombre_completo: string;
  cedula: string;
  nota_preliminar?: number | null;
  nota_definitiva?: number | null;
  observaciones?: string;
  id_entrega?: number | null;
  formato_entrega?: string;
  contenido?: string;
  fecha_entrega?: string;
  guardando?: boolean;
  error?: string;
  mensaje?: string;
}

interface QuizResultado {
  id_estudiante: number;
  nombre_completo: string;
  nota: number;
  acertadas: number;
  total_preguntas: number;
  finalizado_en: string;
}

interface CursoItem {
  id: string;
  tipo: 'tarea' | 'material' | 'evaluacion' | 'quiz';
  titulo: string;
  descripcion?: string;
  porcentaje?: number;
  formatosPermitidos?: string[];
  fechaLimite?: string | null;
  urlRecurso?: string;
  tipoRecurso?: string;
  tieneQuiz?: boolean;
  entregada?: boolean;
  fechaEntrega?: string | null;
}

interface Leccion {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha?: string | null;
  duracionMinutos?: number | null;
  enlaceRecurso?: string | null;
  tipoDiscapacidad?: string | null;
  items: CursoItem[];
}

interface Modulo {
  id: string;
  titulo: string;
  descripcion?: string;
  lecciones: Leccion[];
}

interface CursoDocumento {
  id: string;
  nombre: string;
  descripcion?: string;
  version?: number;
  modulos: Modulo[];
  leccionesSueltas: Leccion[];
}

@Component({
  selector: 'app-course-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LessonCardComponent],
  template: `
    <div class="preview-container">
      <a [routerLink]="['/cursos']" class="btn-back">← Volver a cursos</a>

      <header class="course-hero">
        <div class="hero-main">
          <span class="hero-eyebrow">{{ isEstudiante ? '👨‍🎓 Tu curso' : '🔍 Previsualización' }}</span>
          <h1>{{ documento()?.nombre || 'Previsualización del curso' }}</h1>
          <p class="hero-desc">{{ documento()?.descripcion || 'Sin descripción' }}</p>
          <div class="hero-stats">
            <span class="stat-chip">📦 {{ resumen().modulos }} módulos</span>
            <span class="stat-chip">📚 {{ resumen().lecciones }} clases</span>
            <span class="stat-chip">🎯 {{ resumen().quizzes }} quizzes</span>
            <span class="stat-chip">📝 {{ resumen().tareas }} tareas</span>
            <span class="stat-chip">📎 {{ resumen().materiales }} recursos</span>
          </div>
        </div>
      </header>

      @if (cargando()) {
        <div class="loading">
          <span class="spinner"></span>
          <p class="info-text">Cargando curso...</p>
        </div>
      } @else if (error()) {
        <p class="alert-error">{{ error() }}</p>
      } @else {
        <div class="preview-layout" [class.has-panel]="!isEstudiante">
          @if (!isEstudiante) {
            <aside class="students-panel">
              <h2>Estudiantes matriculados</h2>
              @if (estudiantes().length === 0) {
                <p class="info-text">No hay estudiantes matriculados.</p>
              } @else {
                <ul class="students-list">
                  @for (est of estudiantes(); track est.id_usuario) {
                    <li>
                      <span class="student-avatar">{{ inicial(est.nombre_completo) }}</span>
                      <div class="student-info">
                        <strong>{{ est.nombre_completo }}</strong>
                        <span class="meta">{{ est.cedula }}</span>
                      </div>
                    </li>
                  }
                </ul>
              }
            </aside>
          }

          <main class="content-panel">
            @if (documento()?.modulos?.length === 0 && documento()?.leccionesSueltas?.length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>Este curso aún no tiene contenido.</p>
              </div>
            }

            @for (modulo of documento()?.modulos; track modulo.id) {
              <section class="module-card">
                <div class="module-head">
                  <span class="module-index">{{ moduleIndex($index) }}</span>
                  <div class="module-heading">
                    <h2>{{ modulo.titulo }}</h2>
                    @if (modulo.descripcion) {
                      <p>{{ modulo.descripcion }}</p>
                    }
                  </div>
                </div>
                <div class="module-lessons">
                  @for (leccion of modulo.lecciones; track leccion.id) {
                    @defer (on viewport) {
                      <app-lesson-card
                        [leccion]="leccion"
                        [isEstudiante]="isEstudiante"
                        [leccionAbierta]="leccionAbierta(leccion.id)"
                        [cursoId]="cursoId()"
                        (toggle)="toggleLeccion(leccion.id)"
                        (abrirNotas)="abrirNotas($event)"
                        (abrirEntrega)="abrirEntrega($event)" />
                    } @placeholder {
                      <div class="skeleton lesson-skeleton"></div>
                    }
                  }
                </div>
              </section>
            }

            @if (documento()?.leccionesSueltas?.length) {
              <section class="module-card">
                <div class="module-head">
                  <span class="module-index">∞</span>
                  <div class="module-heading">
                    <h2>Clases sueltas</h2>
                  </div>
                </div>
                <div class="module-lessons">
                  @for (leccion of documento()?.leccionesSueltas; track leccion.id) {
                    <app-lesson-card
                      [leccion]="leccion"
                      [isEstudiante]="isEstudiante"
                      [leccionAbierta]="leccionAbierta(leccion.id)"
                      [cursoId]="cursoId()"
                      (toggle)="toggleLeccion(leccion.id)"
                      (abrirNotas)="abrirNotas($event)"
                      (abrirEntrega)="abrirEntrega($event)" />
                  }
                </div>
              </section>
            }
          </main>
        </div>
      }

      @if (panelNotasAbierto()) {
        <div class="modal-overlay" (click)="cerrarNotas()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ itemNotasSeleccionado()?.titulo }}</h2>
              <button class="btn-close" (click)="cerrarNotas()">✕</button>
            </div>

            @if (cargandoNotas()) {
              <p class="info-text">Cargando notas...</p>
            } @else if (errorNotas()) {
              <p class="alert-error">{{ errorNotas() }}</p>
            } @else {
              @if (modoQuiz()) {
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Nota</th>
                        <th>Acertadas</th>
                        <th>Total</th>
                        <th>Finalizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (fila of resultadosQuiz(); track fila.id_estudiante) {
                        <tr>
                          <td>{{ fila.nombre_completo }}</td>
                          <td>{{ fila.nota }}</td>
                          <td>{{ fila.acertadas }}</td>
                          <td>{{ fila.total_preguntas }}</td>
                          <td>{{ fila.finalizado_en | date:'short' }}</td>
                        </tr>
                      }
                      @if (resultadosQuiz().length === 0) {
                        <tr>
                          <td colspan="5" class="empty-cell">No hay intentos finalizados.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Cédula</th>
                        <th>Nota preliminar</th>
                        <th>Nota definitiva</th>
                        <th>Observaciones</th>
                        <th>Entrega</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (fila of calificaciones(); track fila.id_estudiante) {
                        <tr>
                          <td>{{ fila.nombre_completo }}</td>
                          <td>{{ fila.cedula }}</td>
                          <td>
                            <input type="number" min="0" max="20" step="0.01"
                              [(ngModel)]="fila.nota_preliminar"
                              class="input-nota" />
                          </td>
                          <td>
                            <input type="number" min="0" max="20" step="0.01"
                              [(ngModel)]="fila.nota_definitiva"
                              class="input-nota" />
                          </td>
                          <td>
                            <input type="text"
                              [(ngModel)]="fila.observaciones"
                              placeholder="Observaciones"
                              class="input-obs" />
                          </td>
                          <td>
                            @if (fila.id_entrega) {
                              <span class="entrega-badge">{{ fila.formato_entrega }}</span>
                              <span class="entrega-meta">{{ fila.fecha_entrega | date:'short' }}</span>
                            } @else {
                              <span class="entrega-meta">Sin entrega</span>
                            }
                          </td>
                          <td>
                            <button class="btn-primary" [disabled]="fila.guardando" (click)="guardarCalificacion(fila)">
                              {{ fila.guardando ? 'Guardando...' : 'Guardar' }}
                            </button>
                            @if (fila.error) {
                              <p class="row-error">{{ fila.error }}</p>
                            }
                            @if (fila.mensaje) {
                              <p class="row-success">{{ fila.mensaje }}</p>
                            }
                          </td>
                        </tr>
                      }
                      @if (calificaciones().length === 0) {
                        <tr>
                          <td colspan="7" class="empty-cell">No hay estudiantes matriculados en este curso.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          </div>
        </div>
      }

      @if (panelEntregaAbierto()) {
        <div class="modal-overlay" (click)="cerrarEntrega()">
          <div class="modal-content modal-entrega" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>📤 {{ itemEntregaSeleccionado()?.titulo }}</h2>
              <button class="btn-close" (click)="cerrarEntrega()">✕</button>
            </div>

            <p class="entrega-sub">Entrega tu tarea. Los formatos permitidos son:
              <strong>{{ formatosEntrega().join(', ') }}</strong>
            </p>

            <div class="entrega-tabs">
              <button class="tab" [class.active]="tipoEntrega() === 'URL'" (click)="tipoEntrega.set('URL')">🔗 Enlace</button>
              @for (fmt of formatosArchivo(); track fmt) {
                <button class="tab" [class.active]="tipoEntrega() === fmt" (click)="tipoEntrega.set(fmt)">
                  {{ fmt === 'PDF' ? '📄 PDF' : '📃 Word' }}
                </button>
              }
            </div>

            @if (tipoEntrega() === 'URL') {
              <div class="form-group">
                <label>URL del trabajo</label>
                <input type="url" class="form-input"
                  [(ngModel)]="urlEntrega"
                  placeholder="https://ejemplo.com/mi-trabajo" />
              </div>
            } @else {
              <div class="form-group">
                <label>Archivo ({{ tipoEntrega() }})</label>
                <label class="file-drop">
                  <input type="file" (change)="onArchivoSeleccionado($event)" [accept]="tipoEntrega() === 'PDF' ? '.pdf' : '.doc,.docx'" />
                  <span class="file-placeholder">
                    {{ archivoSeleccionado() ? '✅ ' + archivoSeleccionado()!.name : '🖱️ Haz clic para seleccionar el archivo' }}
                  </span>
                </label>
              </div>
            }

            @if (errorEntrega()) {
              <p class="alert-error">{{ errorEntrega() }}</p>
            }
            @if (mensajeEntrega()) {
              <p class="alert-success">{{ mensajeEntrega() }}</p>
            }

            <div class="modal-actions">
              <button class="btn-outline" (click)="cerrarEntrega()">Cancelar</button>
              <button class="btn-primary" (click)="enviarEntrega()" [disabled]="enviandoEntrega()">
                {{ enviandoEntrega() ? 'Enviando...' : 'Entregar tarea' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .preview-container { width: 100%; padding: clamp(1rem, 2vw, 2rem); }

    .btn-back { display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 1.25rem; color: var(--accent); text-decoration: none; font-size: 0.9rem; font-weight: 600; transition: var(--transition-fast); }
    .btn-back:hover { opacity: 0.8; transform: translateX(-2px); }

    /* ─── Hero ─────────────────────────────────────── */
    .course-hero {
      position: relative;
      background: linear-gradient(135deg, var(--primary-navy) 0%, var(--primary-navy-light) 60%, var(--bg-card) 130%);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 2rem 2.25rem;
      margin-bottom: 1.75rem;
      overflow: hidden;
    }
    .course-hero::after {
      content: '';
      position: absolute;
      right: -60px; top: -60px;
      width: 220px; height: 220px;
      background: radial-gradient(circle, rgba(249, 168, 37, 0.18) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-eyebrow { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--primary-gold-light); margin-bottom: 0.5rem; }
    .hero-main h1 { font-size: 2rem; color: var(--text-primary); margin-bottom: 0.5rem; }
    .hero-desc { color: var(--text-secondary); font-size: 1rem; max-width: 720px; line-height: 1.6; }
    .hero-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
    .stat-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.8rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }

    .loading { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem 0; }
    .spinner { width: 2rem; height: 2rem; border: 3px solid var(--glass-border); border-top-color: var(--primary-gold); border-radius: 50%; animation: spin 0.7s linear infinite; }
    .info-text { color: var(--text-secondary); font-size: 0.95rem; }
    .alert-error { color: var(--error); background: var(--error-bg); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.9rem; }
    .alert-success { color: var(--success); background: var(--success-bg); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.9rem; }

    /* ─── Layout ───────────────────────────────────── */
    .preview-layout { display: grid; grid-template-columns: 1fr; gap: clamp(1rem, 2vw, 1.75rem); align-items: start; }
    .preview-layout.has-panel { grid-template-columns: minmax(240px, 300px) 1fr; }

    .students-panel { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.25rem; position: sticky; top: 1rem; }
    .students-panel h2 { font-size: 1rem; color: var(--text-primary); margin-bottom: 0.75rem; }
    .students-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .students-list li { display: flex; align-items: center; gap: 0.65rem; padding: 0.5rem 0.5rem; border-radius: var(--radius-md); }
    .students-list li:hover { background: var(--glass-highlight); }
    .student-avatar { width: 2rem; height: 2rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary-gold), var(--primary-gold-dark)); color: var(--primary-navy); font-size: 0.8rem; font-weight: 700; }
    .student-info { display: flex; flex-direction: column; min-width: 0; }
    .student-info strong { color: var(--text-primary); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { color: var(--text-muted); font-size: 0.75rem; }

    .content-panel { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }

    /* ─── Módulo ───────────────────────────────────── */
    .module-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.5rem; }
    .module-head { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.25rem; }
    .module-index { flex-shrink: 0; width: 2.5rem; height: 2.5rem; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--primary-gold), var(--primary-gold-dark)); color: var(--primary-navy); font-weight: 800; font-size: 1rem; }
    .module-heading h2 { font-size: 1.2rem; color: var(--text-primary); margin-bottom: 0.25rem; }
    .module-heading p { color: var(--text-secondary); font-size: 0.9rem; }
    .module-lessons { display: flex; flex-direction: column; gap: 0.75rem; }

    .lesson-skeleton { height: 56px; }

    .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
    .empty-state .empty-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; opacity: 0.5; }

    /* ─── Modal ────────────────────────────────────── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 100; }
    .modal-content { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); width: 100%; max-width: 900px; max-height: 90vh; overflow: auto; padding: 1.5rem; box-shadow: var(--shadow-xl); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .modal-header h2 { font-size: 1.25rem; color: var(--text-primary); margin: 0; }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 1.25rem; cursor: pointer; padding: 0.25rem; }
    .btn-close:hover { color: var(--text-primary); }
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .data-table th, .data-table td { padding: 0.6rem 0.75rem; border: 1px solid var(--glass-border); text-align: left; color: var(--text-primary); }
    .data-table th { background: var(--bg-input); color: var(--text-secondary); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .empty-cell { text-align: center; color: var(--text-muted); }
    .input-nota { width: 80px; padding: 0.35rem; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); }
    .input-obs { width: 100%; min-width: 140px; padding: 0.35rem; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); }
    .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem 1.25rem; background: var(--primary-gold); color: var(--primary-navy); border: none; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: var(--transition-fast); }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { padding: 0.6rem 1.25rem; background: transparent; color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; transition: var(--transition-fast); }
    .btn-outline:hover { background: var(--glass-highlight); }
    .entrega-badge { display: inline-block; padding: 0.2rem 0.5rem; background: var(--accent); color: #000; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem; }
    .entrega-meta { color: var(--text-muted); font-size: 0.8rem; }
    .row-error { color: var(--error); font-size: 0.8rem; margin: 0.25rem 0 0; }
    .row-success { color: var(--success); font-size: 0.8rem; margin: 0.25rem 0 0; }

    /* ─── Modal entrega ────────────────────────────── */
    .modal-entrega { max-width: 520px; }
    .entrega-sub { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; }
    .entrega-sub strong { color: var(--text-primary); }
    .entrega-tabs { display: flex; gap: 0.375rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .entrega-tabs .tab { flex: 1 1 120px; padding: 0.5rem; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
    .entrega-tabs .tab.active { background: var(--primary-gold); color: var(--primary-navy); border-color: var(--primary-gold); }
    .entrega-tabs .tab:hover:not(.active) { background: var(--bg-lighter); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem; }
    .form-input { width: 100%; padding: 0.7rem 0.9rem; background: var(--bg-input); color: var(--text-primary); border: 1.5px solid var(--glass-border); border-radius: var(--radius-sm); font-size: 0.9rem; transition: var(--transition-fast); }
    .form-input:focus { outline: none; border-color: var(--primary-gold); }
    .file-drop { display: flex; align-items: center; justify-content: center; padding: 1.5rem 1rem; border: 2px dashed var(--glass-border); border-radius: var(--radius-sm); cursor: pointer; text-align: center; transition: all var(--transition-fast); }
    .file-drop:hover { border-color: var(--primary-gold); background: rgba(249,168,37,0.05); }
    .file-drop input { display: none; }
    .file-drop .file-placeholder { color: var(--text-muted); font-size: 0.85rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }

    /* ─── Responsive ───────────────────────────────── */
    @media (max-width: 768px) {
      .preview-container { padding: 1rem; }
      .course-hero { padding: 1.5rem; }
      .hero-main h1 { font-size: 1.5rem; }
      .hero-desc { font-size: 0.9rem; }
      .preview-layout { grid-template-columns: 1fr; }
      .students-panel { position: static; }
      .module-card { padding: 1.1rem; }
      .module-heading h2 { font-size: 1.05rem; }
      .modal-content { max-width: 100%; }
    }

    @media (max-width: 480px) {
      .hero-stats { gap: 0.35rem; }
      .stat-chip { font-size: 0.72rem; padding: 0.3rem 0.6rem; }
      .module-index { width: 2.1rem; height: 2.1rem; font-size: 0.85rem; }
    }
  `]
})
export class CoursePreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  isEstudiante = (this.authService.getUser()?.rol || '').toLowerCase() === 'estudiante';

  readonly cursoId = signal<string | null>(null);
  readonly documento = signal<CursoDocumento | null>(null);
  readonly estudiantes = signal<Estudiante[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly panelNotasAbierto = signal(false);
  readonly itemNotasSeleccionado = signal<CursoItem | null>(null);
  readonly modoQuiz = signal(false);
  readonly cargandoNotas = signal(false);
  readonly errorNotas = signal<string | null>(null);
  readonly calificaciones = signal<CalificacionFila[]>([]);
  readonly resultadosQuiz = signal<QuizResultado[]>([]);

  readonly leccionesAbiertas = signal<Record<string, boolean>>({});
  private idEvaluacionActiva = signal<number | null>(null);

  readonly resumen = computed(() => {
    const doc = this.documento();
    if (!doc) return { modulos: 0, lecciones: 0, quizzes: 0, tareas: 0, materiales: 0 };
    const todas = [
      ...(doc.modulos || []).flatMap(m => m.lecciones || []),
      ...(doc.leccionesSueltas || []),
    ];
    const items = todas.flatMap(l => l.items || []);
    return {
      modulos: (doc.modulos || []).length,
      lecciones: todas.length,
      quizzes: items.filter(i => i.tipo === 'quiz').length,
      tareas: items.filter(i => i.tipo === 'tarea').length,
      materiales: items.filter(i => i.tipo === 'material').length,
    };
  });

  // Entrega de tareas
  readonly panelEntregaAbierto = signal(false);
  readonly itemEntregaSeleccionado = signal<CursoItem | null>(null);
  readonly tipoEntrega = signal<string>('URL');
  readonly urlEntrega = signal('');
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly enviandoEntrega = signal(false);
  readonly errorEntrega = signal('');
  readonly mensajeEntrega = signal('');

  ngOnInit(): void {
    const idCurso = this.route.snapshot.paramMap.get('id');
    if (!idCurso) {
      this.error.set('ID de curso no proporcionado');
      this.cargando.set(false);
      return;
    }

    this.cursoId.set(idCurso);
    this.cargarCurso(idCurso);
    if (this.isEstudiante) {
      this.cargarMisEntregas();
    } else {
      this.cargarEstudiantes(idCurso);
    }
  }

  private cargarMisEntregas(): void {
    this.http.get<{ success: boolean; data: { evaluaciones: any[]; tareas: any[] } }>(
      `${this.apiUrl}/entregas/mis-entregas`
    ).subscribe({
      next: (res) => {
        if (!res.success || !res.data) return;
        const entregadas = new Set<string>();
        for (const e of res.data.evaluaciones) entregadas.add(e.itemId);
        for (const t of res.data.tareas) entregadas.add(t.itemId);
        this.marcarEntregadas(entregadas);
      },
      error: (err) => {
        console.error('Error al cargar mis entregas:', err);
      },
    });
  }

  private marcarEntregadas(entregadas: Set<string>): void {
    this.documento.update((doc) => {
      if (!doc) return doc;
      const marcarItems = (items: CursoItem[]): CursoItem[] =>
        items.map((i) => ({
          ...i,
          entregada: entregadas.has(i.id) ? true : i.entregada,
        }));
      return {
        ...doc,
        modulos: (doc.modulos || []).map((m) => ({
          ...m,
          lecciones: (m.lecciones || []).map((l) => ({
            ...l,
            items: marcarItems(l.items || []),
          })),
        })),
        leccionesSueltas: (doc.leccionesSueltas || []).map((l) => ({
          ...l,
          items: marcarItems(l.items || []),
        })),
      };
    });
  }

  private cargarCurso(idCurso: string): void {
    this.http.get<{ success: boolean; data: CursoDocumento }>(`${this.apiUrl}/cursos/${idCurso}/document`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.documento.set(res.data);
        } else {
          this.error.set('No se pudo cargar la estructura del curso');
        }
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar el curso');
        this.cargando.set(false);
      },
    });
  }

  private cargarEstudiantes(idCurso: string): void {
    this.http.get<{ success: boolean; data: Estudiante[] }>(`${this.apiUrl}/cursos/${idCurso}/matriculados`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.estudiantes.set(res.data);
        }
      },
      error: (err) => {
        console.error('Error al cargar estudiantes:', err);
      },
    });
  }

  moduleIndex(i: number): string {
    return (i + 1).toString().padStart(2, '0');
  }

  inicial(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/);
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
  }

  toggleLeccion(id: string): void {
    this.leccionesAbiertas.update(estado => ({ ...estado, [id]: !estado[id] }));
  }

  leccionAbierta(id: string): boolean {
    return !!this.leccionesAbiertas()[id];
  }

  iconoItem(tipo: string): string {
    switch (tipo) {
      case 'tarea': return '📝';
      case 'material': return '📎';
      case 'evaluacion': return '📋';
      case 'quiz': return '🎯';
      default: return '📄';
    }
  }

  abrirNotas(item: CursoItem): void {
    this.itemNotasSeleccionado.set(item);
    this.panelNotasAbierto.set(true);
    this.modoQuiz.set(item.tipo === 'quiz');
    this.cargandoNotas.set(true);
    this.errorNotas.set(null);
    this.calificaciones.set([]);
    this.resultadosQuiz.set([]);

    const evalId = this.extraerIdEvaluacion(item.id);
    if (!evalId) {
      this.errorNotas.set('No se pudo identificar la evaluación');
      this.cargandoNotas.set(false);
      return;
    }
    this.idEvaluacionActiva.set(evalId);

    if (item.tipo === 'quiz') {
      this.cargarResultadosQuiz(evalId);
    } else {
      this.cargarCalificacionesEvaluacion(evalId);
    }
  }

  cerrarNotas(): void {
    this.panelNotasAbierto.set(false);
    this.itemNotasSeleccionado.set(null);
    this.idEvaluacionActiva.set(null);
  }

  private extraerIdEvaluacion(itemId: string): number | null {
    const match = itemId.match(/^eva_(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extraerIdTarea(itemId: string): number | null {
    const match = itemId.match(/^tar_(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private cargarCalificacionesEvaluacion(evalId: number): void {
    this.http.get<{ success: boolean; data: CalificacionFila[] }>(
      `${this.apiUrl}/evaluaciones/${evalId}/calificaciones`
    ).subscribe({
      next: (res) => {
        this.cargandoNotas.set(false);
        if (res.success && res.data) {
          this.calificaciones.set(res.data.map(f => ({ ...f, guardando: false, error: '' })));
        } else {
          this.errorNotas.set('No se pudieron cargar las calificaciones');
        }
      },
      error: (err) => {
        this.cargandoNotas.set(false);
        this.errorNotas.set(err.error?.message || 'Error al cargar las calificaciones');
      },
    });
  }

  private cargarResultadosQuiz(evalId: number): void {
    this.http.get<{ success: boolean; data: QuizResultado[] }>(
      `${this.apiUrl}/quizzes/evaluacion/${evalId}/resultados`
    ).subscribe({
      next: (res) => {
        this.cargandoNotas.set(false);
        if (res.success && res.data) {
          this.resultadosQuiz.set(res.data);
        } else {
          this.errorNotas.set('No se pudieron cargar los resultados del quiz');
        }
      },
      error: (err) => {
        this.cargandoNotas.set(false);
        this.errorNotas.set(err.error?.message || 'Error al cargar los resultados del quiz');
      },
    });
  }

  guardarCalificacion(fila: CalificacionFila): void {
    const evalId = this.idEvaluacionActiva();
    if (!evalId) return;

    const convertirNota = (valor: unknown): number | null => {
      if (valor === '' || valor === undefined || valor === null) return null;
      const numero = Number(valor);
      return isNaN(numero) ? null : numero;
    };

    this.actualizarFila(fila.id_estudiante, { guardando: true, error: '', mensaje: '' });

    this.http.post<{ success: boolean; data: CalificacionFila }>(
      `${this.apiUrl}/evaluaciones/${evalId}/calificaciones`,
      {
        id_estudiante: fila.id_estudiante,
        nota_preliminar: convertirNota(fila.nota_preliminar),
        nota_definitiva: convertirNota(fila.nota_definitiva),
        observaciones: fila.observaciones ?? null,
      }
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.actualizarFila(fila.id_estudiante, {
            guardando: false,
            error: '',
            mensaje: 'Guardado',
            nota_preliminar: res.data.nota_preliminar ?? null,
            nota_definitiva: res.data.nota_definitiva ?? null,
            observaciones: res.data.observaciones ?? '',
          });
          setTimeout(() => this.actualizarFila(fila.id_estudiante, { mensaje: '' }), 2000);
        } else {
          this.actualizarFila(fila.id_estudiante, { guardando: false, error: 'No se pudo guardar la calificación' });
        }
      },
      error: (err) => {
        this.actualizarFila(fila.id_estudiante, {
          guardando: false,
          error: err.error?.message || 'Error al guardar la calificación',
        });
      },
    });
  }

  private actualizarFila(idEstudiante: number, cambios: Partial<CalificacionFila>): void {
    this.calificaciones.update(arr =>
      arr.map(f => (f.id_estudiante === idEstudiante ? { ...f, ...cambios } : f))
    );
  }

  // ─── Entrega de tareas ────────────────────────────
  formatosEntrega(): string[] {
    const item = this.itemEntregaSeleccionado();
    return item?.formatosPermitidos?.length ? item.formatosPermitidos : ['PDF'];
  }

  formatosArchivo(): string[] {
    const validos = ['PDF', 'WORD'];
    return this.formatosEntrega().filter(f => validos.includes(f.toUpperCase()));
  }

  abrirEntrega(item: CursoItem): void {
    if (!this.isEstudiante) return;
    this.itemEntregaSeleccionado.set(item);
    this.panelEntregaAbierto.set(true);
    this.tipoEntrega.set('URL');
    this.urlEntrega.set('');
    this.archivoSeleccionado.set(null);
    this.errorEntrega.set('');
    this.mensajeEntrega.set('');
  }

  cerrarEntrega(): void {
    this.panelEntregaAbierto.set(false);
    this.itemEntregaSeleccionado.set(null);
    this.archivoSeleccionado.set(null);
    this.errorEntrega.set('');
    this.mensajeEntrega.set('');
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado.set(input.files?.length ? input.files[0] : null);
  }

  enviarEntrega(): void {
    const item = this.itemEntregaSeleccionado();
    if (!item || this.enviandoEntrega()) return;

    const estudianteId = this.authService.getUser()?.id_usuario;
    if (!estudianteId) {
      this.errorEntrega.set('No se pudo identificar al estudiante');
      return;
    }

    const esTarea = item.tipo === 'tarea';
    const idDestino = esTarea
      ? this.extraerIdTarea(item.id)
      : this.extraerIdEvaluacion(item.id);
    if (!idDestino) {
      this.errorEntrega.set('No se pudo identificar la tarea o el estudiante');
      return;
    }

    const endpoint = esTarea
      ? `${this.apiUrl}/entregas/tarea/${idDestino}`
      : `${this.apiUrl}/entregas`;
    const campoId = esTarea ? 'id_tarea_curso' : 'id_evaluacion';

    const tipo = this.tipoEntrega();
    this.enviandoEntrega.set(true);
    this.errorEntrega.set('');
    this.mensajeEntrega.set('');

    if (tipo === 'URL') {
      const url = this.urlEntrega().trim();
      if (!url) {
        this.errorEntrega.set('Escribe la URL de tu trabajo');
        this.enviandoEntrega.set(false);
        return;
      }
      this.http.post<{ success: boolean; message: string }>(
        endpoint,
        { [campoId]: idDestino, id_estudiante: estudianteId, tipo_entrega: 'URL', url_enlace: url }
      ).subscribe({
        next: (res) => {
          this.enviandoEntrega.set(false);
          this.onEntregaExitosa(item, res.message);
        },
        error: (err) => {
          this.enviandoEntrega.set(false);
          this.errorEntrega.set(err.error?.message || 'Error al enviar la entrega');
        },
      });
    } else {
      const archivo = this.archivoSeleccionado();
      if (!archivo) {
        this.errorEntrega.set('Selecciona un archivo para entregar');
        this.enviandoEntrega.set(false);
        return;
      }
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append(campoId, String(idDestino));
      formData.append('id_estudiante', String(estudianteId));
      formData.append('tipo_entrega', tipo);

      this.http.post<{ success: boolean; message: string }>(
        endpoint,
        formData
      ).subscribe({
        next: (res) => {
          this.enviandoEntrega.set(false);
          this.onEntregaExitosa(item, res.message);
        },
        error: (err) => {
          this.enviandoEntrega.set(false);
          this.errorEntrega.set(err.error?.message || 'Error al enviar la entrega');
        },
      });
    }
  }

  private onEntregaExitosa(item: CursoItem, message?: string): void {
    this.mensajeEntrega.set(message || 'Entrega registrada correctamente ✅');
    this.marcarItemEntregado(item.id);
    this.toastService.success('🎉 ¡Entrega registrada correctamente!');
    setTimeout(() => this.cerrarEntrega(), 1200);
  }

  private marcarItemEntregado(itemId: string): void {
    const marcarItems = (items: CursoItem[]): CursoItem[] =>
      items.map((i) => (i.id === itemId ? { ...i, entregada: true, fechaEntrega: new Date().toISOString() } : i));
    this.documento.update((doc) => {
      if (!doc) return doc;
      return {
        ...doc,
        modulos: (doc.modulos || []).map((m) => ({
          ...m,
          lecciones: (m.lecciones || []).map((l) => ({
            ...l,
            items: marcarItems(l.items || []),
          })),
        })),
        leccionesSueltas: (doc.leccionesSueltas || []).map((l) => ({
          ...l,
          items: marcarItems(l.items || []),
        })),
      };
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>📖 Cursos</h1>
      <p class="page-subtitle">Gestión de cursos y editor visual</p>
    </div>

    @if (puedeCrear) {
      @if (!mostrarFormulario) {
        <div class="courses-actions">
          <button class="btn-primary" (click)="mostrarFormulario = true">➕ Nuevo curso</button>
        </div>
      } @else {
        <div class="form-card">
          <h3>Crear nuevo curso</h3>
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" [(ngModel)]="nuevoCurso.nombre" placeholder="Nombre del curso" />
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea [(ngModel)]="nuevoCurso.descripcion" placeholder="Descripción opcional" rows="2"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-primary" (click)="crearCurso()" [disabled]="creando || !nuevoCurso.nombre.trim()">
              {{ creando ? 'Creando...' : 'Crear y editar' }}
            </button>
            <button class="btn-outline" (click)="cancelarCreacion()">Cancelar</button>
          </div>
          @if (crearError) {
            <p class="alert-error">{{ crearError }}</p>
          }
        </div>
      }
    }

    @if (loading) {
      <p class="info-text">Cargando cursos...</p>
    } @else if (error) {
      <p class="alert-error">{{ error }}</p>
    }

    @if (cursos.length > 0) {
      <div class="courses-list">
        @for (curso of cursos; track curso.id_curso) {
          <div class="course-card">
            <div class="course-info">
              <h3>{{ curso.nombre }}</h3>
              <p>{{ curso.descripcion || 'Sin descripción' }}</p>
              <span class="meta">Docente: {{ curso.docente_nombre || 'Sin asignar' }}</span>
            </div>
            <div class="course-actions">
              @if (isEstudiante) {
                <a [routerLink]="['/cursos', curso.id_curso, 'estudiar']" class="btn-sm btn-preview">👁️ Ver curso</a>
              } @else {
                <a [routerLink]="['/cursos', curso.id_curso, 'editor']" class="btn-sm">✏️ Editar</a>
                @if (puedeCrear) {
                  <a [routerLink]="['/cursos', curso.id_curso, 'preview']" class="btn-sm btn-preview">👁️ Previsualizar</a>
                  <button class="btn-sm btn-enroll" (click)="abrirModal(curso)">🎓 Inscribir estudiantes</button>
                }
              }
            </div>
          </div>
        }
      </div>
    } @else if (!loading) {
      <p class="info-text">No hay cursos disponibles.</p>
    }

    @if (modalAbierto()) {
      <div class="modal-backdrop" (click)="cerrarModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Inscribir estudiantes en {{ cursoSeleccionado()?.nombre }}</h3>
            <button class="btn-close" (click)="cerrarModal()" aria-label="Cerrar">×</button>
          </div>

          @if (cargandoEstudiantes()) {
            <p class="info-text">Cargando estudiantes...</p>
          } @else if (errorEstudiantes()) {
            <p class="alert-error">{{ errorEstudiantes() }}</p>
          } @else if (estudiantesDisponibles().length === 0) {
            <p class="info-text">No hay estudiantes disponibles para inscribir.</p>
          } @else {
            <ul class="students-list">
              @for (est of estudiantesDisponibles(); track est.id_usuario) {
                <li class="student-item">
                  <div class="student-info">
                    <strong>{{ est.nombre_completo }}</strong>
                    <span class="student-meta">{{ est.cedula }} · {{ est.email }}</span>
                  </div>
                  <button
                    class="btn-sm btn-enroll"
                    (click)="inscribirEstudiante(est.id_usuario)"
                    [disabled]="inscribiendoId() === est.id_usuario">
                    {{ inscribiendoId() === est.id_usuario ? 'Inscribiendo...' : 'Inscribir' }}
                  </button>
                </li>
              }
            </ul>
          }

          <div class="modal-footer">
            <button class="btn-outline" (click)="cerrarModal()">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .courses-actions { margin-bottom: 1.5rem; }
    .btn-primary { display: inline-block; padding: 0.85rem 1.5rem; background: var(--primary-gold); color: #000; border: none; border-radius: var(--radius-md); font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn-primary:hover { background: var(--primary-gold-light); }
    .btn-sm { display: inline-flex; align-items: center; justify-content: center; padding: 0.4rem 0.6rem; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); text-decoration: none; font-size: 0.85rem; line-height: 1.2; text-align: center; white-space: normal; word-break: break-word; flex: 1 1 auto; min-width: 100px; }
    .btn-sm:hover { background: var(--glass-border); }
    .info-text { color: var(--text-secondary); font-size: 0.95rem; }
    .alert-error { color: #ef4444; background: rgba(239,68,68,0.1); padding: 0.75rem 1rem; border-radius: var(--radius-md); }
    .courses-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
    .course-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .course-actions { flex-shrink: 0; display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; max-width: 230px; }
    @media (max-width: 480px) { .course-card { flex-direction: column; align-items: stretch; } .course-actions { width: 100%; max-width: none; justify-content: flex-start; } }
    .course-info h3 { font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem; }
    .course-info p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; }
    .course-info .meta { color: var(--text-muted); font-size: 0.8rem; }
    .course-actions { flex-shrink: 0; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-preview { background: var(--accent); color: #000; }
    .form-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem; max-width: 500px; }
    .form-card h3 { font-size: 1.1rem; color: var(--text-primary); margin-bottom: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem; }
    .form-group input, .form-group textarea { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--primary-gold); }
    .form-actions { display: flex; gap: 0.75rem; align-items: center; }
    .btn-outline { padding: 0.6rem 1rem; background: transparent; color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); cursor: pointer; }
    .btn-outline:hover { background: var(--glass-border); }
    .btn-enroll { background: var(--accent); color: #000; }
    .btn-enroll:disabled { opacity: 0.6; cursor: not-allowed; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 1.5rem; width: 100%; max-width: 560px; max-height: 80vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .modal-header h3 { font-size: 1.15rem; color: var(--text-primary); margin: 0; }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 1.5rem; line-height: 1; cursor: pointer; }
    .btn-close:hover { color: var(--text-primary); }
    .students-list { list-style: none; padding: 0; margin: 0; }
    .student-item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.75rem; border-bottom: 1px solid var(--glass-border); }
    .student-item:last-child { border-bottom: none; }
    .student-info { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .student-info strong { color: var(--text-primary); font-size: 0.95rem; }
    .student-meta { color: var(--text-muted); font-size: 0.8rem; }
    .modal-footer { margin-top: 1rem; display: flex; justify-content: flex-end; }
  `]
})
export class CoursesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  cursos: any[] = [];
  loading = true;
  error = '';

  mostrarFormulario = false;
  creando = false;
  crearError = '';
  nuevoCurso = { nombre: '', descripcion: '' };
  puedeCrear = false;
  isEstudiante = false;

  modalAbierto = signal(false);
  cursoSeleccionado = signal<any>(null);
  estudiantesDisponibles = signal<any[]>([]);
  cargandoEstudiantes = signal(false);
  errorEstudiantes = signal('');
  inscribiendoId = signal<number | null>(null);

  get user() {
    return this.authService.getUser();
  }

  ngOnInit() {
    // Asegurar que la sesión esté restaurada antes de evaluar permisos
    this.authService.restoreSession();
    this.calcularPermisos();
    this.loadCursos();
  }

  private calcularPermisos() {
    const user = this.authService.getUser();
    const rol = (user?.rol || '').toLowerCase();
    this.puedeCrear = rol === 'admin' || rol === 'administrador' || rol === 'docente';
    this.isEstudiante = rol === 'estudiante';
  }

  loadCursos() {
    this.loading = true;
    const url = this.isEstudiante ? `${this.apiUrl}/cursos/mis-cursos` : `${this.apiUrl}/cursos`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.cursos = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al cargar los cursos';
        this.loading = false;
      }
    });
  }

  cancelarCreacion() {
    this.mostrarFormulario = false;
    this.nuevoCurso = { nombre: '', descripcion: '' };
    this.crearError = '';
  }

  crearCurso() {
    const nombre = this.nuevoCurso.nombre.trim();
    if (!nombre) return;

    this.creando = true;
    this.crearError = '';

    const id_docente = this.user?.id_usuario;

    this.http.post<any>(`${this.apiUrl}/cursos`, {
      nombre,
      descripcion: this.nuevoCurso.descripcion.trim() || null,
      id_docente,
    }).subscribe({
      next: (res) => {
        const id_curso = res.data?.id_curso;
        if (id_curso) {
          this.router.navigate(['/cursos', id_curso, 'editor']);
        } else {
          this.creando = false;
          this.crearError = 'Curso creado pero no se recibió el identificador';
        }
      },
      error: (err) => {
        this.creando = false;
        this.crearError = err.error?.message || 'Error al crear el curso';
      }
    });
  }

  abrirModal(curso: any) {
    this.cursoSeleccionado.set(curso);
    this.modalAbierto.set(true);
    this.errorEstudiantes.set('');
    this.cargarEstudiantesDisponibles();
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.cursoSeleccionado.set(null);
    this.estudiantesDisponibles.set([]);
    this.errorEstudiantes.set('');
    this.inscribiendoId.set(null);
  }

  cargarEstudiantesDisponibles() {
    const curso = this.cursoSeleccionado();
    if (!curso) return;

    this.cargandoEstudiantes.set(true);
    this.http.get<any>(`${this.apiUrl}/cursos/${curso.id_curso}/estudiantes-disponibles`).subscribe({
      next: (res) => {
        this.estudiantesDisponibles.set(res.data || []);
        this.cargandoEstudiantes.set(false);
      },
      error: (err) => {
        this.errorEstudiantes.set(err.error?.message || 'Error al cargar estudiantes disponibles');
        this.cargandoEstudiantes.set(false);
      }
    });
  }

  inscribirEstudiante(idEstudiante: number) {
    const curso = this.cursoSeleccionado();
    if (!curso) return;

    this.inscribiendoId.set(idEstudiante);
    this.http.post<any>(`${this.apiUrl}/cursos/${curso.id_curso}/matricular`, { id_estudiante: idEstudiante }).subscribe({
      next: () => {
        this.inscribiendoId.set(null);
        this.cargarEstudiantesDisponibles();
      },
      error: (err) => {
        this.inscribiendoId.set(null);
        this.errorEstudiantes.set(err.error?.message || 'Error al inscribir estudiante');
      }
    });
  }
}

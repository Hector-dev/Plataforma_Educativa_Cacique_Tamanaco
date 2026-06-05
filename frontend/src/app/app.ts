import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { environment } from '../environments/environment';
import { Chart, registerables } from 'chart.js';
import { OfflineStorageService } from './core/services/offline-storage.service';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs';
Chart.register(...registerables);

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  icon: string;
  message: string;
}

interface ModalConfig {
  show: boolean;
  title: string;
  mode: 'create' | 'edit';
  description?: string;
  submitLabel?: string;
  fields: ModalField[];
  onSave: (form: Record<string, string>) => void;
}

interface ModalField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'number' | 'date' | 'file';
  required: boolean;
  placeholder?: string;
  value?: string;
  accept?: string;
  options?: { label: string; value: string }[];
}

interface CursoExpandido {
  curso: any;
  clases: any[];
  expanded: boolean;
  clasesLoading: boolean;
  canvasTareas: TareaCanvas[];    // tareas del editor visual
  canvasMateriales: MaterialCanvas[]; // materiales del editor visual
  estudiantes: any[];             // estudiantes matriculados
  estudiantesLoading: boolean;
}

interface ClaseConEvaluaciones {
  clase: any;
  evaluaciones: any[];
}

interface TareaCanvas {
  id: string;         // 'tar_N'
  titulo: string;
  descripcion: string;
  formatosPermitidos: string[];
  fechaLimite: string | null;
  claseTitulo: string;
  claseId: string;    // 'lec_N'
}

interface MaterialCanvas {
  id: string;         // 'mat_N'
  titulo: string;
  descripcion: string;
  urlRecurso: string;
  tipoRecurso: string; // 'video', 'PDF', 'enlace', 'documento', etc.
  claseTitulo: string;
  claseId: string;    // 'lec_N'
}

interface ClaseDetalle {
  id: string;           // 'lec_N'
  titulo: string;
  descripcion: string;
  duracionMinutos: number | null;
  fecha: string | null;
  enlaceRecurso: string | null;
  tipoDiscapacidad: string | null;
  materiales: MaterialCanvas[];
  tareas: TareaCanvas[];
  quizzes: { titulo: string; porcentaje: number }[];
  moduloTitulo: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private offline = inject(OfflineStorageService);
  private authService = inject(AuthService);
  router = inject(Router);
  private apiUrl = environment.apiUrl;

  // ─── Theme ────────────────────────────────────────────────
  isDark = true;

  // ─── Auth ─────────────────────────────────────────────────
  currentView = 'login';
  user: any = null;
  token = '';
  loginEmail = 'admin@admin.com';
  loginPassword = 'admin';
  loginError = '';
  loading = false;

  // ─── Role helpers ─────────────────────────────────────────
  get isAdmin(): boolean {
    return this.user?.rol?.toLowerCase() === 'administrador' || this.user?.rol?.toLowerCase() === 'admin';
  }

  get isDocente(): boolean {
    return this.user?.rol?.toLowerCase() === 'docente';
  }

  get isEstudiante(): boolean {
    return this.user?.rol?.toLowerCase() === 'estudiante';
  }

  // ─── Sidebar / Mobile ─────────────────────────────────────
  sidebarCollapsed = false;
  mobileMenuOpen = false;
  menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'usuarios', icon: '👥', label: 'Usuarios' },
    { id: 'cursos', icon: '📖', label: 'Cursos' },
    { id: 'asistencia', icon: '✅', label: 'Asistencia' },
    { id: 'reportes', icon: '📈', label: 'Reportes' },
  ];

  // ─── Toast Notifications ──────────────────────────────────
  toasts: Toast[] = [];
  private toastId = 0;

  // ─── Loading States ───────────────────────────────────────
  kpiLoading = false;
  usuariosLoading = false;
  cursosLoading = false;
  asistenciaLoading = false;

  // ─── Dashboard ────────────────────────────────────────────
  kpiCards: any[] = [];
  chart: Chart | null = null;

  // ─── Student Dashboard ────────────────────────────────────
  misCursos: any[] = [];
  misCursosLoading = false;
  miAsistencia: any = null;
  miAsistenciaLoading = false;

  // ─── Usuarios ─────────────────────────────────────────────
  usuarios: any[] = [];

  // ─── Cursos (expandable cards con Clases + Evaluaciones) ──
  cursosExpand: CursoExpandido[] = [];
  // Cache de clases con evaluaciones por curso: Map<id_curso, ClaseConEvaluaciones[]>
  clasesCache: Map<number, ClaseConEvaluaciones[]> = new Map();

  // ─── Asistencia ───────────────────────────────────────────
  alumnos: any[] = [];
  pendingCount = 0;
  claseActual = 1;

  // ─── Reportes ────────────────────────────────────────────
  reporteTipo = 'asistencia-general';
  reporteCursoId = '';
  reporteCursos: any[] = [];
  reporteLoading = false;
  reporteError = '';
  reporteData: any[] | null = null;
  reporteColumnas: string[] = [];

  // ─── Entrega Tarea (zona de subida) ──────────────────────
  entregaActiva: TareaCanvas | null = null;
  entregaCursoId = 0;
  entregaTipo: 'URL' | 'PDF' | 'WORD' = 'URL';
  entregaUrl = '';
  entregaArchivo: File | null = null;
  entregaLoading = false;
  entregaError = '';

  // ─── Clase Detalle (estudiante) ──────────────────────────
  claseDetalleOpen = false;
  claseDetalleLoading = false;
  claseDetalle: ClaseDetalle | null = null;

  // ─── CRUD Modal ───────────────────────────────────────────
  modal: ModalConfig = {
    show: false,
    title: '',
    mode: 'create',
    fields: [],
    onSave: () => { }
  };
  modalForm: Record<string, string> = {};
  modalLoading = false;
  modalError = '';
  selectedFile: File | null = null;

  // ─── Quiz Editor ─────────────────────────────────────────
  quizEditorOpen = false;
  quizEditEvaluacion: any = null;
  quizEditCursoId = 0;
  quizEditLoading = false;
  quizEditSaving = false;
  quizEditQuestions: any[] = [];
  quizEditQuestionIndex: number | null = null;   // null = nueva pregunta
  quizEditFormEnunciado = '';
  quizEditFormTipo: 'opcion_multiple' | 'verdadero_falso' = 'opcion_multiple';
  quizEditFormOpciones: { texto: string; es_correcta: boolean }[] = [];

  // ─── Quiz Resultados (profesor) ─────────────────────────
  quizResultadosOpen = false;
  quizResultadosEvaluacion: any = null;
  quizResultadosLoading = false;
  quizResultadosData: any[] = [];

  // ─── Standalone Route detection ──────────────────────────
  isStandaloneRoute = false;

  // ─── Helpers ──────────────────────────────────────────────

  private isStandalonePath(path: string): boolean {
    return path.includes('/editor') || path.includes('/quiz');
  }

  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════

  ngOnInit() {
    this.loadTheme();

    // Detectar rutas standalone (editor, quiz) para ocultar sidebar + dashboard
    this.isStandaloneRoute = this.isStandalonePath(window.location.pathname);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isStandaloneRoute = this.isStandalonePath(e.urlAfterRedirects);
    });

    // Restaurar sesión si existe token válido
    const saved = this.authService.restoreSession();
    if (saved.isAuthenticated) {
      this.token = saved.token!;
      this.user = saved.user;
      this.currentView = 'dashboard';
      this.loadDashboard();
      if (!this.isEstudiante) {
        this.loadUsuarios();
        this.loadCursos();
        setTimeout(() => this.buildChart(), 300);
      }
    }
  }

  ngAfterViewInit() {
    // buildChart se llama desde ngOnInit con setTimeout(300)
  }

  // ═══════════════════════════════════════════════════════════
  // THEME TOGGLE
  // ═══════════════════════════════════════════════════════════

  loadTheme() {
    const saved = localStorage.getItem('cactam_theme');
    if (saved === 'light') {
      this.isDark = false;
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      this.isDark = true;
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    if (this.isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('cactam_theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('cactam_theme', 'light');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════

  addToast(type: Toast['type'], message: string) {
    const icons: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const id = ++this.toastId;
    this.toasts.push({ id, type, icon: icons[type] || '💬', message });
    setTimeout(() => this.removeToast(id), 4000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // ═══════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════

  onLogin() {
    console.log('[Cacique] onLogin() called. loginEmail:', this.loginEmail, 'loginPassword length:', this.loginPassword?.length);
    if (!this.loginEmail || !this.loginPassword) return;
    this.loading = true;
    this.loginError = '';
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: (res) => {
        console.log('[Cacique] login SUCCESS. token:', !!res.token, 'user:', res.user?.nombre_completo);
        this.token = res.token;
        this.user = res.user;
        this.currentView = 'dashboard';
        this.loading = false;
        console.log('[Cacique] currentView set to:', this.currentView, 'token:', !!this.token, 'user:', !!this.user);
        this.loginPassword = '';
        this.addToast('success', `Bienvenido, ${res.user.nombre_completo}`);
        this.loadDashboard();
        if (!this.isEstudiante) {
          this.loadUsuarios();
          this.loadCursos();
          setTimeout(() => this.buildChart(), 300);
        }
      },
      error: (err) => {
        console.error('[Cacique] login ERROR:', err);
        this.loading = false;
        this.loginError = err.error?.message || 'Error de conexión';
        this.addToast('error', this.loginError);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.user = null; this.token = '';
    this.currentView = 'login'; this.mobileMenuOpen = false;
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════

  setView(view: string) {
    // Role-based view access
    if (view === 'asistencia' && this.isEstudiante) return;
    if (view === 'usuarios' && !this.isAdmin) return;
    if (view === 'reportes' && this.isEstudiante) return;

    this.currentView = view;
    if (view === 'dashboard') {
      this.loadDashboard();
    }
    if (view === 'cursos') this.loadCursos();
    if (view === 'asistencia') this.loadAsistencia();
    if (view === 'reportes') this.loadReportes();
  }

  // ═══════════════════════════════════════════════════════════
  // CRUD MODAL
  // ═══════════════════════════════════════════════════════════

  openModal(config: Omit<ModalConfig, 'show'>) {
    this.modal = { ...config, show: true };
    this.modalForm = {};
    config.fields.forEach(f => { this.modalForm[f.name] = f.value || ''; });
    this.modalError = '';
    this.modalLoading = false;
    this.selectedFile = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  closeModal() { this.modal.show = false; }

  submitModal() {
    this.modalLoading = true;
    this.modalError = '';
    this.modal.onSave(this.modalForm);
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════

  loadDashboard() {
    if (this.isEstudiante) {
      // ── Dashboard de Estudiante: sus cursos + asistencia personal ──
      this.misCursosLoading = true;
      this.miAsistenciaLoading = true;

      this.http.get<any>(`${this.apiUrl}/cursos/mis-cursos`).subscribe({
        next: (res) => { this.misCursos = res.data || []; this.misCursosLoading = false; },
        error: () => { this.misCursos = []; this.misCursosLoading = false; }
      });

      this.http.get<any>(`${this.apiUrl}/asistencia/mi-asistencia`).subscribe({
        next: (res) => { this.miAsistencia = res.data; this.miAsistenciaLoading = false; },
        error: () => { this.miAsistencia = null; this.miAsistenciaLoading = false; }
      });
    } else {
      // ── Dashboard de Admin/Docente: KPIs generales ──
      this.kpiLoading = true;
      this.http.get<any>(`${this.apiUrl}/cursos`).subscribe({
        next: (cursosRes) => {
          const cursos = cursosRes.data || cursosRes;
          this.http.get<any>(`${this.apiUrl}/usuarios`).subscribe({
            next: (usuariosRes) => {
              const usuarios = usuariosRes.data || usuariosRes;
              const estudiantes = usuarios.filter((u: any) => u.rol === 'Estudiante' || u.rol === 'estudiante').length;
              this.kpiCards = [
                { label: 'Usuarios', value: usuarios.length, icon: '👥' },
                { label: 'Estudiantes', value: estudiantes, icon: '🎓' },
                { label: 'Cursos', value: cursos.length, icon: '📚' },
                { label: 'Conectado', value: '✅', icon: '🌐' },
              ];
              this.kpiLoading = false;
            },
            error: () => {
              this.kpiCards = [
                { label: 'Usuarios', value: 0, icon: '👥' }, { label: 'Estudiantes', value: 0, icon: '🎓' },
                { label: 'Cursos', value: 0, icon: '📚' }, { label: 'Conectado', value: '❌', icon: '🌐' },
              ];
              this.kpiLoading = false;
            }
          });
        },
        error: () => {
          this.kpiCards = [
            { label: 'Usuarios', value: 0, icon: '👥' }, { label: 'Estudiantes', value: 0, icon: '🎓' },
            { label: 'Cursos', value: 0, icon: '📚' }, { label: 'Conectado', value: '❌', icon: '🌐' },
          ];
          this.kpiLoading = false;
        }
      });
      // Render chart inmediatamente con datos vacíos, actualizar cuando llegue API
      setTimeout(() => this.initChart([0, 0, 0, 0, 0]), 100);
      this.buildChart();
    }
  }

  /** Renderiza el canvas inmediatamente, sin esperar API */
  private initChart(data: number[]) {
    const canvas = document.getElementById('asistenciaChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.chart) { this.chart.destroy(); }
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
        datasets: [{
          label: 'Presentes', data,
          backgroundColor: 'rgba(249, 168, 37, 0.7)', borderColor: '#f9a825',
          borderWidth: 2, borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }

  buildChart() {
    this.http.get<any>(`${this.apiUrl}/asistencia/semanal`).subscribe({
      next: (res) => {
        const data = res.data || [0, 0, 0, 0, 0];
        // Actualizar chart existente sin recrear
        if (this.chart) {
          this.chart.data.datasets[0].data = data;
          this.chart.update();
        }
      },
      error: () => {
        // Ya se renderizó con zeros, no hacer nada
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // USUARIOS CRUD
  // ═══════════════════════════════════════════════════════════

  loadUsuarios() {
    this.usuariosLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/usuarios`).subscribe({
      next: (data: any) => { this.usuarios = data.data || data; this.usuariosLoading = false; },
      error: () => { this.usuarios = []; this.usuariosLoading = false; }
    });
  }

  openCrearUsuario() {
    this.openModal({
      title: 'Crear Usuario', mode: 'create',
      fields: [
        { name: 'nombre_completo', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej: Juan Pérez' },
        { name: 'cedula', label: 'Cédula', type: 'text', required: true, placeholder: 'Ej: V-12345678' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'correo@ejemplo.com' },
        { name: 'password', label: 'Contraseña', type: 'password', required: true, placeholder: 'Mínimo 6 caracteres' },
        {
          name: 'rol', label: 'Rol', type: 'select', required: true, options: [
            { label: 'Administrador', value: 'admin' }, { label: 'Docente', value: 'docente' }, { label: 'Estudiante', value: 'estudiante' },
          ], value: 'estudiante'
        },
        {
          name: 'genero', label: 'Género', type: 'select', required: false, options: [
            { label: 'No especificar', value: '' }, { label: 'Masculino', value: 'masculino' }, { label: 'Femenino', value: 'femenino' }, { label: 'Otro', value: 'otro' },
          ], value: ''
        },
      ],
      onSave: (form) => {
        this.http.post<any>(`${this.apiUrl}/usuarios`, {
          nombre_completo: form['nombre_completo'], cedula: form['cedula'],
          email: form['email'], password: form['password'], rol: form['rol'],
          genero: form['genero'] || null,
        }).subscribe({
          next: () => { this.closeModal(); this.addToast('success', 'Usuario creado'); this.loadUsuarios(); },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al crear usuario'; }
        });
      }
    });
  }

  openEditarUsuario(u: any) {
    this.openModal({
      title: 'Editar Usuario', mode: 'edit',
      fields: [
        { name: 'nombre_completo', label: 'Nombre completo', type: 'text', required: true, value: u.nombre_completo },
        { name: 'cedula', label: 'Cédula', type: 'text', required: true, value: u.cedula },
        { name: 'email', label: 'Email', type: 'email', required: true, value: u.email },
        { name: 'password', label: 'Contraseña (dejar vacía para mantener)', type: 'password', required: false, placeholder: '••••••••' },
        {
          name: 'rol', label: 'Rol', type: 'select', required: true, options: [
            { label: 'Administrador', value: 'admin' }, { label: 'Docente', value: 'docente' }, { label: 'Estudiante', value: 'estudiante' },
          ], value: u.rol === 'Administrador' ? 'admin' : u.rol
        },
        {
          name: 'genero', label: 'Género', type: 'select', required: false, options: [
            { label: 'No especificar', value: '' }, { label: 'Masculino', value: 'masculino' }, { label: 'Femenino', value: 'femenino' }, { label: 'Otro', value: 'otro' },
          ], value: u.genero || ''
        },
      ],
      onSave: (form) => {
        const payload: Record<string, any> = { nombre_completo: form['nombre_completo'], cedula: form['cedula'], email: form['email'], rol: form['rol'], genero: form['genero'] || null };
        if (form['password']) payload['password'] = form['password'];
        this.http.put<any>(`${this.apiUrl}/usuarios/${u.id_usuario}`, payload).subscribe({
          next: () => { this.closeModal(); this.addToast('success', 'Usuario actualizado'); this.loadUsuarios(); },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al actualizar'; }
        });
      }
    });
  }

  eliminarUsuario(u: any) {
    if (!confirm(`¿Eliminar permanentemente a "${u.nombre_completo}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/usuarios/${u.id_usuario}`).subscribe({
      next: () => { this.addToast('success', 'Usuario eliminado'); this.loadUsuarios(); },
      error: (err) => this.addToast('error', err.error?.message || 'Error al eliminar')
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CURSOS (expandable cards con Clases anidadas + Evaluaciones)
  // ═══════════════════════════════════════════════════════════

  loadCursos() {
    this.cursosLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/cursos`).subscribe({
      next: (data: any) => {
        const cursos = data.data || data;
        // Preserve existing expanded/loaded state when refreshing
        const oldMap = new Map<number, CursoExpandido>();
        this.cursosExpand.forEach(ce => oldMap.set(ce.curso.id_curso, ce));
        this.cursosExpand = cursos.map((c: any) => {
          const old = oldMap.get(c.id_curso);
          if (old) {
            // Keep expanded state and already-loaded clases
            old.curso = c; // Update curso metadata (name, description)
            return old;
          }
          return { curso: c, clases: [], expanded: false, clasesLoading: false, canvasTareas: [], canvasMateriales: [], estudiantes: [], estudiantesLoading: false };
        });
        // Remove cached classes for cursos that no longer exist
        const newIds = new Set(cursos.map((c: any) => c.id_curso));
        this.clasesCache.forEach((_, key) => {
          if (!newIds.has(key)) this.clasesCache.delete(key);
        });
        this.cursosLoading = false;
      },
      error: () => { this.cursosExpand = []; this.cursosLoading = false; }
    });
  }

  toggleCurso(cursoItem: CursoExpandido) {
    cursoItem.expanded = !cursoItem.expanded;
    if (cursoItem.expanded && cursoItem.clases.length === 0) {
      this.loadClasesForCurso(cursoItem);
    }
    if (cursoItem.expanded && cursoItem.estudiantes.length === 0) {
      this.loadEstudiantesForCurso(cursoItem);
    }
    if (cursoItem.expanded && cursoItem.canvasTareas.length === 0) {
      this.loadCanvasTareas(cursoItem);
    }
  }

  loadClasesForCurso(cursoItem: CursoExpandido) {
    const cursoId = cursoItem.curso.id_curso;
    cursoItem.clasesLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/clases/curso/${cursoId}`).subscribe({
      next: (data: any) => {
        const clases = data.data || data;
        cursoItem.clases = clases;
        cursoItem.clasesLoading = false;
        // Cargar evaluaciones para este curso
        this.loadEvaluacionesForCurso(cursoId);
      },
      error: () => { cursoItem.clases = []; cursoItem.clasesLoading = false; }
    });
  }

  loadEvaluacionesForCurso(cursoId: number) {
    this.http.get<any>(`${this.apiUrl}/evaluaciones/curso/${cursoId}`).subscribe({
      next: (data: any) => {
        const evaluaciones = data.data || [];
        // Agrupar evaluaciones por id_clase
        const cache: ClaseConEvaluaciones[] = [];
        const evalsByClase = new Map<number, any[]>();
        evaluaciones.forEach((e: any) => {
          if (!evalsByClase.has(e.id_clase)) evalsByClase.set(e.id_clase, []);
          evalsByClase.get(e.id_clase)!.push(e);
        });
        // Construir la cache
        const cursoItem = this.cursosExpand.find(c => c.curso.id_curso === cursoId);
        if (cursoItem) {
          cursoItem.clases.forEach(cl => {
            cache.push({ clase: cl, evaluaciones: evalsByClase.get(cl.id_clase) || [] });
          });
        }
        // Replace Map reference to trigger Angular change detection
        this.clasesCache.set(cursoId, cache);
        this.clasesCache = new Map(this.clasesCache);
      },
      error: () => {
        this.clasesCache.set(cursoId, []);
        this.clasesCache = new Map(this.clasesCache);
      }
    });
  }

  getClasesConEvaluaciones(cursoId: number): ClaseConEvaluaciones[] {
    return this.clasesCache.get(cursoId) || [];
  }

  loadCanvasTareas(cursoItem: CursoExpandido) {
    const cursoId = cursoItem.curso.id_curso;
    this.http.get<any>(`${this.apiUrl}/cursos/${cursoId}/document`).subscribe({
      next: (res: any) => {
        const doc = res.data;
        const tareas: TareaCanvas[] = [];
        const materiales: MaterialCanvas[] = [];

        const processItems = (items: any[], claseTitulo: string, claseId: string) => {
          for (const item of items) {
            if (item.tipo === 'tarea') {
              tareas.push({
                id: item.id,
                titulo: item.titulo,
                descripcion: item.descripcion || '',
                formatosPermitidos: item.formatosPermitidos || ['PDF'],
                fechaLimite: item.fechaLimite || null,
                claseTitulo,
                claseId,
              });
            } else if (item.tipo === 'material') {
              materiales.push({
                id: item.id,
                titulo: item.titulo,
                descripcion: item.descripcion || '',
                urlRecurso: item.urlRecurso || '',
                tipoRecurso: item.tipoRecurso || 'enlace',
                claseTitulo,
                claseId,
              });
            }
          }
        };

        if (doc?.modulos) {
          for (const mod of doc.modulos) {
            for (const lec of (mod.lecciones || [])) {
              processItems(lec.items || [], lec.titulo, lec.id);
            }
          }
        }
        if (doc?.leccionesSueltas) {
          for (const lec of doc.leccionesSueltas) {
            processItems(lec.items || [], lec.titulo, lec.id);
          }
        }

        cursoItem.canvasTareas = [...tareas];
        cursoItem.canvasMateriales = [...materiales];
      },
      error: () => { cursoItem.canvasTareas = []; cursoItem.canvasMateriales = []; }
    });
  }

  // ─── Curso CRUD ─────────────────────────────────────────

  openCrearCurso() {
    const docentes = this.usuarios.filter(u => u.rol === 'docente' || u.rol === 'Docente' || u.rol === 'admin' || u.rol === 'Administrador');
    const docenteOptions = docentes.map(d => ({ label: `${d.nombre_completo} (${d.rol})`, value: String(d.id_usuario) }));
    // Pre-seleccionar el primer docente (usualmente el admin)
    const defaultDocente = docenteOptions.length > 0 ? docenteOptions[0].value : '';
    this.openModal({
      title: 'Crear Curso', mode: 'create',
      fields: [
        { name: 'id_docente', label: 'Docente', type: 'select', required: true, options: docenteOptions, value: defaultDocente },
        { name: 'nombre', label: 'Nombre del curso', type: 'text', required: true, placeholder: 'Ej: Matemáticas 5to Grado' },
        { name: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción del curso...' },
      ],
      onSave: (form) => {
        this.modalLoading = true;
        this.http.post<any>(`${this.apiUrl}/cursos`, {
          id_docente: parseInt(form['id_docente']), nombre: form['nombre'], descripcion: form['descripcion'],
        }).subscribe({
          next: (res) => {
            this.closeModal();
            this.addToast('success', 'Curso creado — abriendo editor');
            const idCurso = res.data?.id_curso;
            if (idCurso) {
              setTimeout(() => this.router.navigate(['/cursos', idCurso, 'editor']), 400);
            } else {
              this.loadCursos();
            }
          },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al crear curso'; }
        });
      }
    });
  }

  openEditarCurso(c: any) {
    this.openModal({
      title: 'Editar Curso', mode: 'edit',
      fields: [
        { name: 'nombre', label: 'Nombre del curso', type: 'text', required: true, value: c.nombre },
        { name: 'descripcion', label: 'Descripción', type: 'text', required: false, value: c.descripcion || '' },
      ],
      onSave: (form) => {
        this.http.put<any>(`${this.apiUrl}/cursos/${c.id_curso}`, { nombre: form['nombre'], descripcion: form['descripcion'] }).subscribe({
          next: () => { this.closeModal(); this.addToast('success', 'Curso actualizado'); this.loadCursos(); },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al actualizar'; }
        });
      }
    });
  }

  eliminarCurso(c: any) {
    if (!confirm(`¿Eliminar permanentemente el curso "${c.nombre}" y todas sus clases?`)) return;
    this.http.delete<any>(`${this.apiUrl}/cursos/${c.id_curso}`).subscribe({
      next: () => { this.addToast('success', 'Curso eliminado'); this.loadCursos(); },
      error: (err) => this.addToast('error', err.error?.message || 'Error al eliminar')
    });
  }

  // ─── Matricular estudiante ──────────────────────────────

  openMatricularEstudiante(curso: any) {
    // Cargar estudiantes desde el API
    this.http.get<any>(`${this.apiUrl}/usuarios`).subscribe({
      next: (res: any) => {
        const estudiantes = (res.data || res || []).filter((u: any) => u.rol?.toLowerCase() === 'estudiante');
        if (estudiantes.length === 0) {
          this.addToast('warning', 'No hay estudiantes disponibles para matricular');
          return;
        }
        this.openModal({
          title: `Matricular en "${curso.nombre}"`,
          mode: 'create',
          fields: [
            {
              name: 'id_estudiante', label: 'Estudiante', type: 'select', required: true,
              options: estudiantes.map((e: any) => ({
                value: String(e.id_usuario),
                label: `${e.nombre_completo}${e.cedula ? ` (C.I. ${e.cedula})` : ''}`
              }))
            },
          ],
          onSave: (form) => {
            this.http.post<any>(`${this.apiUrl}/cursos/${curso.id_curso}/matricular`, {
              id_estudiante: parseInt(form['id_estudiante'], 10)
            }).subscribe({
              next: () => {
                this.closeModal();
                this.addToast('success', 'Estudiante matriculado exitosamente');
                if ((curso as any).estudiantes !== undefined) {
                  this.loadEstudiantesForCurso(curso as any);
                }
              },
              error: (err) => {
                this.modalLoading = false;
                this.modalError = err.error?.message || 'Error al matricular estudiante';
              }
            });
          }
        });
      },
      error: () => {
        this.addToast('error', 'Error al cargar lista de estudiantes');
      }
    });
  }

  // ─── Cargar estudiantes matriculados ────────────────────

  loadEstudiantesForCurso(cursoItem: CursoExpandido) {
    const cursoId = cursoItem.curso.id_curso;
    cursoItem.estudiantesLoading = true;
    this.http.get<any>(`${this.apiUrl}/cursos/${cursoId}/matriculados`).subscribe({
      next: (res: any) => {
        cursoItem.estudiantes = res.data || [];
        cursoItem.estudiantesLoading = false;
      },
      error: () => {
        cursoItem.estudiantes = [];
        cursoItem.estudiantesLoading = false;
      }
    });
  }

  retirarEstudiante(cursoItem: CursoExpandido, estudiante: any) {
    if (!confirm(`¿Retirar a "${estudiante.nombre_completo}" del curso "${cursoItem.curso.nombre}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/cursos/${cursoItem.curso.id_curso}/matricular/${estudiante.id_usuario}`)
      .subscribe({
        next: () => {
          this.addToast('success', `"${estudiante.nombre_completo}" retirado del curso`);
          cursoItem.estudiantes = cursoItem.estudiantes.filter((e: any) => e.id_usuario !== estudiante.id_usuario);
        },
        error: (err) => this.addToast('error', err.error?.message || 'Error al retirar estudiante')
      });
  }

  // ─── Clase CRUD (dentro de un curso) ─────────────────────

  openCrearClase(cursoId: number) {
    this.openModal({
      title: 'Agregar Clase al Curso', mode: 'create',
      fields: [
        { name: 'id_curso', label: 'ID Curso', type: 'number', required: true, value: String(cursoId) },
        { name: 'titulo', label: 'Título de la clase', type: 'text', required: true, placeholder: 'Ej: Introducción a las fracciones' },
        { name: 'descripcion', label: 'Descripción (opcional)', type: 'text', required: false, placeholder: 'Contenido...' },
        { name: 'fecha', label: 'Fecha', type: 'date', required: false },
      ],
      onSave: (form) => {
        this.http.post<any>(`${this.apiUrl}/clases`, {
          id_curso: parseInt(form['id_curso']), titulo: form['titulo'],
          descripcion: form['descripcion'], fecha: form['fecha'] || new Date().toISOString().split('T')[0],
        }).subscribe({
          next: () => {
            this.closeModal(); this.addToast('success', 'Clase agregada');
            const item = this.cursosExpand.find(c => c.curso.id_curso === cursoId);
            if (item) this.loadClasesForCurso(item);
          },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al crear clase'; }
        });
      }
    });
  }

  openEditarClase(cl: any, cursoId: number) {
    this.openModal({
      title: 'Editar Clase', mode: 'edit',
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', required: true, value: cl.titulo },
        { name: 'descripcion', label: 'Descripción', type: 'text', required: false, value: cl.descripcion || '' },
        { name: 'fecha', label: 'Fecha', type: 'date', required: false, value: cl.fecha ? cl.fecha.split('T')[0] : '' },
      ],
      onSave: (form) => {
        this.http.put<any>(`${this.apiUrl}/clases/${cl.id_clase}`, {
          titulo: form['titulo'], descripcion: form['descripcion'], fecha: form['fecha'],
        }).subscribe({
          next: () => {
            this.closeModal(); this.addToast('success', 'Clase actualizada');
            const item = this.cursosExpand.find(c => c.curso.id_curso === cursoId);
            if (item) this.loadClasesForCurso(item);
          },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al actualizar'; }
        });
      }
    });
  }

  eliminarClase(cl: any, cursoId: number) {
    if (!confirm(`¿Eliminar permanentemente la clase "${cl.titulo}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/clases/${cl.id_clase}`).subscribe({
      next: () => {
        this.addToast('success', 'Clase eliminada');
        const item = this.cursosExpand.find(c => c.curso.id_curso === cursoId);
        if (item) this.loadClasesForCurso(item);
      },
      error: (err) => this.addToast('error', err.error?.message || 'Error al eliminar')
    });
  }

  // ─── Evaluación CRUD (actividad entregable) ──────────────

  openCrearEvaluacion(claseId: number, cursoId: number) {
    this.openModal({
      title: 'Agregar Actividad Entregable', mode: 'create',
      fields: [
        { name: 'id_clase', label: 'ID Clase', type: 'number', required: true, value: String(claseId) },
        { name: 'titulo_evaluacion', label: 'Título de la actividad', type: 'text', required: true, placeholder: 'Ej: Tarea 1 - Fracciones' },
        { name: 'porcentaje', label: 'Porcentaje (%)', type: 'number', required: true, placeholder: 'Ej: 25' },
      ],
      onSave: (form) => {
        this.http.post<any>(`${this.apiUrl}/evaluaciones`, {
          id_clase: parseInt(form['id_clase']), titulo_evaluacion: form['titulo_evaluacion'],
          porcentaje: parseFloat(form['porcentaje']),
        }).subscribe({
          next: () => {
            this.closeModal(); this.addToast('success', 'Actividad creada');
            this.loadEvaluacionesForCurso(cursoId);
          },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al crear actividad'; }
        });
      }
    });
  }

  openEditarEvaluacion(e: any, cursoId: number) {
    this.openModal({
      title: 'Editar Actividad', mode: 'edit',
      fields: [
        { name: 'titulo_evaluacion', label: 'Título', type: 'text', required: true, value: e.titulo_evaluacion },
        { name: 'porcentaje', label: 'Porcentaje (%)', type: 'number', required: true, value: String(e.porcentaje) },
      ],
      onSave: (form) => {
        this.http.put<any>(`${this.apiUrl}/evaluaciones/${e.id_evaluacion}`, {
          titulo_evaluacion: form['titulo_evaluacion'], porcentaje: parseFloat(form['porcentaje']),
        }).subscribe({
          next: () => {
            this.closeModal(); this.addToast('success', 'Actividad actualizada');
            this.loadEvaluacionesForCurso(cursoId);
          },
          error: (err) => { this.modalLoading = false; this.modalError = err.error?.message || 'Error al actualizar'; }
        });
      }
    });
  }

  eliminarEvaluacion(e: any, cursoId: number) {
    if (!confirm(`¿Eliminar la actividad "${e.titulo_evaluacion}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/evaluaciones/${e.id_evaluacion}`).subscribe({
      next: () => { this.addToast('success', 'Actividad eliminada'); this.loadEvaluacionesForCurso(cursoId); },
      error: (err) => this.addToast('error', err.error?.message || 'Error al eliminar')
    });
  }

  // ─── Quiz: Empezar ────────────────────────────────────────

  empezarQuiz(evaluacion: any) {
    this.router.navigate(['/quiz', evaluacion.id_evaluacion]);
  }

  // ─── Quiz: Editor de preguntas ────────────────────────────

  openEditarQuiz(evaluacion: any, cursoId: number) {
    this.quizEditEvaluacion = evaluacion;
    this.quizEditCursoId = cursoId;
    this.quizEditQuestions = [];
    this.quizEditorOpen = true;
    this.quizEditLoading = true;
    this.quizEditQuestionIndex = null;

    this.http.get<{ success: boolean; data: any }>(
      `${this.apiUrl}/quizzes/evaluacion/${evaluacion.id_evaluacion}`
    ).subscribe({
      next: (res) => {
        this.quizEditLoading = false;
        if (res.success && res.data && res.data.preguntas) {
          this.quizEditQuestions = res.data.preguntas.map((p: any) => ({
            id: p.id,
            enunciado: p.enunciado,
            tipo: p.tipo,
            opciones: p.opciones.map((o: any) => ({
              texto: o.texto,
              es_correcta: (o as any).es_correcta === true,
            }))
          }));
        } else {
          // Quiz existe pero sin preguntas o el endpoint devuelve yaCompletado
          this.quizEditQuestions = [];
        }
      },
      error: (err) => {
        this.quizEditLoading = false;
        if (err.status === 404) {
          this.quizEditQuestions = [];
        } else {
          this.addToast('error', 'Error al cargar el quiz');
          this.quizEditorOpen = false;
        }
      }
    });
  }

  cerrarEditorQuiz() {
    this.quizEditorOpen = false;
    this.quizEditEvaluacion = null;
    this.quizEditQuestions = [];
    this.quizEditQuestionIndex = null;
  }

  // ─── Quiz: Ver resultados (profesor) ─────────────────────

  verNotasQuiz(evaluacion: any) {
    this.quizResultadosEvaluacion = evaluacion;
    this.quizResultadosOpen = true;
    this.quizResultadosLoading = true;
    this.quizResultadosData = [];

    this.http.get<{ success: boolean; data: any }>(
      `${this.apiUrl}/quizzes/evaluacion/${evaluacion.id_evaluacion}`
    ).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.id) {
          this.http.get<{ success: boolean; data: any[] }>(
            `${this.apiUrl}/quizzes/${res.data.id}/resultados`
          ).subscribe({
            next: (r) => {
              this.quizResultadosLoading = false;
              this.quizResultadosData = r.success ? r.data : [];
            },
            error: () => {
              this.quizResultadosLoading = false;
              this.quizResultadosData = [];
            }
          });
        } else {
          this.quizResultadosLoading = false;
          this.quizResultadosData = [];
        }
      },
      error: () => {
        this.quizResultadosLoading = false;
        this.quizResultadosData = [];
      }
    });
  }

  cerrarNotasQuiz() {
    this.quizResultadosOpen = false;
    this.quizResultadosEvaluacion = null;
    this.quizResultadosData = [];
  }

  // ─── Quiz Editor: Agregar / Editar pregunta ──────────────

  quizEditarPregunta(index: number) {
    const q = this.quizEditQuestions[index];
    this.quizEditQuestionIndex = index;
    this.quizEditFormEnunciado = q.enunciado;
    this.quizEditFormTipo = q.tipo;
    this.quizEditFormOpciones = q.opciones.map((o: any) => ({ ...o }));
  }

  quizNuevaPregunta() {
    this.quizEditQuestionIndex = null;
    this.quizEditFormEnunciado = '';
    this.quizEditFormTipo = 'opcion_multiple';
    this.quizEditFormOpciones = [
      { texto: '', es_correcta: false },
      { texto: '', es_correcta: false },
    ];
  }

  quizCancelarEditarPregunta() {
    this.quizEditQuestionIndex = -2; // -2 = no editing, -1 = was new canceled
  }

  quizAgregarOpcion() {
    if (this.quizEditFormOpciones.length < 4) {
      this.quizEditFormOpciones.push({ texto: '', es_correcta: false });
    }
  }

  quizQuitarOpcion(index: number) {
    if (this.quizEditFormOpciones.length > 2) {
      this.quizEditFormOpciones.splice(index, 1);
    }
  }

  quizGuardarPregunta() {
    if (!this.quizEditFormEnunciado.trim()) {
      this.addToast('error', 'El enunciado de la pregunta es obligatorio');
      return;
    }

    if (this.quizEditFormTipo === 'opcion_multiple') {
      const validas = this.quizEditFormOpciones.filter(o => o.texto.trim());
      if (validas.length < 2) {
        this.addToast('error', 'Debe haber al menos 2 opciones con texto');
        return;
      }
      if (!this.quizEditFormOpciones.some(o => o.es_correcta)) {
        this.addToast('error', 'Debe marcar una opción como correcta');
        return;
      }
    } else {
      // verdadero_falso: aseguramos 2 opciones
      this.quizEditFormOpciones = [
        { texto: 'Verdadero', es_correcta: this.quizEditFormOpciones[0]?.es_correcta ?? true },
        { texto: 'Falso', es_correcta: !(this.quizEditFormOpciones[0]?.es_correcta ?? true) },
      ];
    }

    const pregunta = {
      enunciado: this.quizEditFormEnunciado.trim(),
      tipo: this.quizEditFormTipo,
      opciones: this.quizEditFormOpciones.filter(o => o.texto.trim()),
    };

    if (this.quizEditQuestionIndex === null) {
      this.quizEditQuestions.push(pregunta);
    } else {
      this.quizEditQuestions[this.quizEditQuestionIndex] = pregunta;
    }

    this.quizEditQuestionIndex = -2; // cerrar editor
  }

  quizEliminarPregunta(index: number) {
    if (confirm('¿Eliminar esta pregunta?')) {
      this.quizEditQuestions.splice(index, 1);
      if (this.quizEditQuestionIndex === index) {
        this.quizEditQuestionIndex = -2;
      }
    }
  }

  quizCambiarTipo() {
    if (this.quizEditFormTipo === 'verdadero_falso') {
      this.quizEditFormOpciones = [
        { texto: 'Verdadero', es_correcta: true },
        { texto: 'Falso', es_correcta: false },
      ];
    } else {
      this.quizEditFormOpciones = [
        { texto: '', es_correcta: false },
        { texto: '', es_correcta: false },
      ];
    }
  }

  // ─── Quiz Editor: Guardar todo ────────────────────────────

  quizGuardarTodo() {
    if (this.quizEditQuestions.length === 0) {
      this.addToast('error', 'Debe agregar al menos una pregunta');
      return;
    }

    const evaluacion = this.quizEditEvaluacion;
    this.quizEditSaving = true;

    const payload = {
      titulo: `Quiz: ${evaluacion.titulo_evaluacion}`,
      descripcion: '',
      tiempo_limite_min: null,
      activo: true,
      preguntas: this.quizEditQuestions,
    };

    this.http.put<any>(
      `${this.apiUrl}/quizzes/evaluacion/${evaluacion.id_evaluacion}`,
      payload
    ).subscribe({
      next: () => {
        this.quizEditSaving = false;
        this.addToast('success', 'Quiz guardado exitosamente');
        this.cerrarEditorQuiz();
        this.loadEvaluacionesForCurso(this.quizEditCursoId);
      },
      error: (err) => {
        this.quizEditSaving = false;
        this.addToast('error', err.error?.message || 'Error al guardar el quiz');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ESTUDIANTE: Entregar Tarea & Empezar Quiz
  // ═══════════════════════════════════════════════════════════

  openEntregarTarea(evaluacion: any, cursoId: number) {
    const desc = `📊 Puntaje: ${evaluacion.porcentaje}%\nFormatos aceptados: PDF, WORD, URL`;
    this.openModal({
      title: `📤 Entregar: ${evaluacion.titulo_evaluacion}`,
      mode: 'create',
      submitLabel: '📤 Entregar',
      description: desc,
      fields: [
        { name: 'tipo_entrega', label: 'Tipo de entrega', type: 'select', required: true,
          options: [
            { label: '🔗 Enlace (URL)', value: 'URL' },
            { label: '📄 Subir archivo (PDF)', value: 'PDF' },
            { label: '📝 Subir archivo (Word)', value: 'WORD' },
          ]
        },
        { name: 'archivo', label: 'Seleccionar archivo', type: 'file', required: false,
          accept: '.pdf,.doc,.docx' },
        { name: 'url_enlace', label: 'Enlace (URL)', type: 'text', required: false,
          placeholder: 'https://github.com/mi-tarea' },
      ],
      onSave: (form) => {
        this.modalLoading = true;
        const tipo = form['tipo_entrega'];
        const fd = new FormData();
        fd.append('id_evaluacion', String(evaluacion.id_evaluacion));
        fd.append('id_estudiante', String(this.user.id_usuario));
        fd.append('tipo_entrega', tipo);
        if (tipo === 'URL') {
          fd.append('url_enlace', form['url_enlace'] || '');
        } else if (this.selectedFile) {
          fd.append('archivo', this.selectedFile);
        }
        const token = this.authService.getToken?.() || this.token;
        fetch(`${this.apiUrl}/entregas`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        }).then(r => r.json()).then(res => {
          this.modalLoading = false;
          if (res.success) {
            this.closeModal();
            this.addToast('success', `✅ Tarea entregada — ${res.data?.formato_entrega || 'OK'}`);
          } else {
            this.modalError = res.message || 'Error al entregar';
          }
        }).catch(() => {
          this.modalLoading = false;
          this.modalError = 'Error de conexión al entregar la tarea';
        });
      }
    });
  }

  openEntregarTareaCanvas(tarea: TareaCanvas, cursoId: number) {
    this.entregaActiva = tarea;
    this.entregaCursoId = cursoId;
    this.entregaTipo = (tarea.formatosPermitidos.includes('PDF') ? 'PDF' :
                        tarea.formatosPermitidos.includes('WORD') ? 'WORD' : 'URL');
    this.entregaUrl = '';
    this.entregaArchivo = null;
    this.entregaError = '';
    this.entregaLoading = false;
  }

  cancelarEntrega() {
    this.entregaActiva = null;
    this.entregaArchivo = null;
    this.entregaUrl = '';
    this.entregaError = '';
  }

  // ─── Clase Detalle (para estudiantes) ─────────────────────

  openClaseDetalle(lecId: string, cursoItem: CursoExpandido) {
    this.claseDetalleLoading = true;
    this.claseDetalleOpen = true;
    this.claseDetalle = null;

    this.http.get<any>(`${this.apiUrl}/cursos/${cursoItem.curso.id_curso}/document`).subscribe({
      next: (res: any) => {
        const doc = res.data;
        let leccionEncontrada: any = null;
        let moduloTitulo = '';

        // Buscar en módulos
        if (doc?.modulos) {
          for (const mod of doc.modulos) {
            for (const lec of (mod.lecciones || [])) {
              if (lec.id === lecId) {
                leccionEncontrada = lec;
                moduloTitulo = mod.titulo;
                break;
              }
            }
            if (leccionEncontrada) break;
          }
        }
        // Buscar en lecciones sueltas
        if (!leccionEncontrada && doc?.leccionesSueltas) {
          for (const lec of doc.leccionesSueltas) {
            if (lec.id === lecId) {
              leccionEncontrada = lec;
              moduloTitulo = 'General';
              break;
            }
          }
        }

        if (!leccionEncontrada) {
          this.claseDetalleLoading = false;
          this.addToast('error', 'No se encontró la clase');
          this.claseDetalleOpen = false;
          return;
        }

        const materiales: MaterialCanvas[] = [];
        const tareas: TareaCanvas[] = [];
        const quizzes: { titulo: string; porcentaje: number }[] = [];

        for (const item of (leccionEncontrada.items || [])) {
          if (item.tipo === 'material') {
            materiales.push({
              id: item.id,
              titulo: item.titulo,
              descripcion: item.descripcion || '',
              urlRecurso: item.urlRecurso || '',
              tipoRecurso: item.tipoRecurso || 'enlace',
              claseTitulo: leccionEncontrada.titulo,
              claseId: leccionEncontrada.id,
            });
          } else if (item.tipo === 'tarea') {
            tareas.push({
              id: item.id,
              titulo: item.titulo,
              descripcion: item.descripcion || '',
              formatosPermitidos: item.formatosPermitidos || ['PDF'],
              fechaLimite: item.fechaLimite || null,
              claseTitulo: leccionEncontrada.titulo,
              claseId: leccionEncontrada.id,
            });
          } else if (item.tipo === 'quiz' || item.tipo === 'evaluacion') {
            quizzes.push({
              titulo: item.titulo,
              porcentaje: item.porcentaje || 0,
            });
          }
        }

        this.claseDetalle = {
          id: leccionEncontrada.id,
          titulo: leccionEncontrada.titulo,
          descripcion: leccionEncontrada.descripcion || '',
          duracionMinutos: leccionEncontrada.duracionMinutos || null,
          fecha: leccionEncontrada.fecha || null,
          enlaceRecurso: leccionEncontrada.enlaceRecurso || null,
          tipoDiscapacidad: leccionEncontrada.tipoDiscapacidad || null,
          materiales,
          tareas,
          quizzes,
          moduloTitulo,
        };
        this.claseDetalleLoading = false;
      },
      error: () => {
        this.claseDetalleLoading = false;
        this.addToast('error', 'Error al cargar los detalles de la clase');
        this.claseDetalleOpen = false;
      }
    });
  }

  cerrarClaseDetalle() {
    this.claseDetalleOpen = false;
    this.claseDetalle = null;
  }

  onEntregaArchivoSeleccionado(event: any) {
    const file = event.dataTransfer?.files?.[0] || event.target?.files?.[0];
    if (file) this.entregaArchivo = file;
  }

  enviarEntrega() {
    const tarea = this.entregaActiva;
    if (!tarea) return;
    this.entregaLoading = true;
    this.entregaError = '';

    const claseIdNum = parseInt(tarea.claseId.replace('lec_', ''), 10);
    this.http.get<any>(`${this.apiUrl}/evaluaciones/clase/${claseIdNum}`).subscribe({
      next: (evData: any) => {
        const evs = evData.data || [];
        const idEval = evs.length > 0 ? evs[0].id_evaluacion : null;
        if (!idEval) {
          this.entregaLoading = false;
          this.entregaError = 'No hay evaluación asociada a esta clase.';
          return;
        }

        if (this.entregaTipo === 'URL') {
          if (!this.entregaUrl.trim()) {
            this.entregaLoading = false;
            this.entregaError = 'Escribe un enlace URL.';
            return;
          }
          this.http.post<any>(`${this.apiUrl}/entregas`, {
            id_evaluacion: idEval,
            id_estudiante: this.user.id_usuario,
            tipo_entrega: 'URL',
            url_enlace: this.entregaUrl,
          }).subscribe({
            next: () => {
              this.entregaActiva = null;
              this.entregaLoading = false;
              this.addToast('success', `✅ "${tarea.titulo}" entregada`);
            },
            error: (err) => {
              this.entregaLoading = false;
              this.entregaError = err.error?.message || 'Error al entregar';
            }
          });
        } else {
          if (!this.entregaArchivo) {
            this.entregaLoading = false;
            this.entregaError = 'Selecciona un archivo.';
            return;
          }
          const fd = new FormData();
          fd.append('id_evaluacion', String(idEval));
          fd.append('id_estudiante', String(this.user.id_usuario));
          fd.append('tipo_entrega', this.entregaTipo);
          fd.append('archivo', this.entregaArchivo);
          const token = this.authService.getToken?.() || this.token;
          fetch(`${this.apiUrl}/entregas`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd,
          }).then(r => r.json()).then(res => {
            this.entregaLoading = false;
            if (res.success) {
              this.entregaActiva = null;
              this.addToast('success', `✅ "${tarea.titulo}" entregada`);
            } else {
              this.entregaError = res.message || 'Error al entregar';
            }
          }).catch(() => {
            this.entregaLoading = false;
            this.entregaError = 'Error de conexión.';
          });
        }
      },
      error: () => {
        this.entregaLoading = false;
        this.entregaError = 'No se pudo encontrar la evaluación asociada.';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN / DOCENTE: Editar y eliminar tareas del Canvas
  // ═══════════════════════════════════════════════════════════

  openEditarTareaCanvas(tarea: TareaCanvas, cursoItem: CursoExpandido) {
    const formatosStr = tarea.formatosPermitidos.join(', ');
    this.openModal({
      title: `✏️ Editar: ${tarea.titulo}`,
      mode: 'edit',
      submitLabel: '💾 Guardar',
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', required: true, value: tarea.titulo },
        { name: 'descripcion', label: 'Descripción', type: 'text', required: false, value: tarea.descripcion },
        { name: 'formatos', label: 'Formatos (PDF, WORD, URL)', type: 'text', required: true, value: formatosStr },
        { name: 'fechaLimite', label: 'Fecha límite', type: 'date', required: false, value: tarea.fechaLimite?.split('T')[0] || '' },
      ],
      onSave: (form) => {
        this.modalLoading = true;
        this.modalError = '';
        const cursoId = cursoItem.curso.id_curso;

        // Obtener el documento actual del curso
        this.http.get<any>(`${this.apiUrl}/cursos/${cursoId}/document`).subscribe({
          next: (res: any) => {
            const doc = res.data;
            // Buscar y actualizar la tarea en el documento
            let found = false;
            const updateItems = (items: any[]) => {
              for (const item of items) {
                if (item.id === tarea.id) {
                  item.titulo = form['titulo'];
                  item.descripcion = form['descripcion'] || '';
                  item.formatosPermitidos = form['formatos'].split(',').map((f: string) => f.trim()).filter(Boolean);
                  if (form['fechaLimite']) item.fechaLimite = new Date(form['fechaLimite']).toISOString();
                  found = true;
                  return;
                }
              }
            };

            for (const mod of doc.modulos || []) {
              for (const lec of mod.lecciones || []) {
                updateItems(lec.items || []);
              }
            }
            for (const lec of doc.leccionesSueltas || []) {
              updateItems(lec.items || []);
            }

            if (!found) {
              this.modalLoading = false;
              this.modalError = 'No se encontró la tarea en el documento del curso.';
              return;
            }

            // Guardar el documento actualizado
            this.http.put<any>(`${this.apiUrl}/cursos/${cursoId}/document`, doc).subscribe({
              next: () => {
                this.closeModal();
                this.addToast('success', 'Tarea actualizada correctamente');
                this.loadCanvasTareas(cursoItem);
              },
              error: (err) => {
                this.modalLoading = false;
                this.modalError = err.error?.message || 'Error al guardar los cambios';
              }
            });
          },
          error: (err) => {
            this.modalLoading = false;
            this.modalError = err.error?.message || 'Error al obtener el documento del curso';
          }
        });
      }
    });
  }

  eliminarTareaCanvas(tarea: TareaCanvas, cursoItem: CursoExpandido) {
    if (!confirm(`¿Eliminar permanentemente la tarea "${tarea.titulo}"?`)) return;
    const cursoId = cursoItem.curso.id_curso;

    this.http.get<any>(`${this.apiUrl}/cursos/${cursoId}/document`).subscribe({
      next: (res: any) => {
        const doc = res.data;
        const removeFrom = (items: any[]) => {
          const idx = items.findIndex((i: any) => i.id === tarea.id);
          if (idx >= 0) items.splice(idx, 1);
        };
        for (const mod of doc.modulos || []) {
          for (const lec of mod.lecciones || []) {
            removeFrom(lec.items || []);
          }
        }
        for (const lec of doc.leccionesSueltas || []) {
          removeFrom(lec.items || []);
        }

        this.http.put<any>(`${this.apiUrl}/cursos/${cursoId}/document`, doc).subscribe({
          next: () => {
            this.addToast('success', 'Tarea eliminada');
            this.loadCanvasTareas(cursoItem);
          },
          error: (err) => this.addToast('error', err.error?.message || 'Error al eliminar')
        });
      },
      error: (err) => this.addToast('error', err.error?.message || 'Error al obtener el documento')
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ASISTENCIA (Offline-First)
  // ═══════════════════════════════════════════════════════════

  async loadAsistencia() {
    this.asistenciaLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/usuarios`).subscribe({
      next: async (data: any) => {
        this.alumnos = (data.data || data).filter((u: any) => u.rol === 'Estudiante' || u.rol === 'estudiante');
        await this.cargarEstadosLocales();
        this.asistenciaLoading = false;
      },
      error: async () => { this.alumnos = []; this.asistenciaLoading = false; }
    });
    this.pendingCount = (await this.offline.getPendingAsistencias()).length;
  }

  async cargarEstadosLocales() {
    const localData = await this.offline.asistencias.where('id_clase').equals(this.claseActual).toArray();
    this.alumnos = this.alumnos.map(a => {
      const saved = localData.find((ld: any) => ld.id_estudiante === a.id_usuario);
      return saved ? { ...a, estado: saved.estado } : a;
    });
  }

  async marcarAsistencia(alumno: any, estado: 'presente' | 'ausente' | 'justificado') {
    await this.offline.saveAsistencia({
      id_clase: this.claseActual, id_estudiante: alumno.id_usuario, estado,
      fecha_registro: new Date().toISOString(), sincronizado: false
    });
    alumno.estado = estado;
    this.pendingCount = (await this.offline.getPendingAsistencias()).length;
    this.addToast('info', `${alumno.nombre_completo}: marcado como ${estado}`);
  }

  async syncData() {
    try {
      const pendientes = await this.offline.getPendingAsistencias();
      if (pendientes.length === 0) { this.addToast('info', 'No hay datos pendientes'); return; }
      this.http.post<any>(`${this.apiUrl}/sync`, {
        asistencias: pendientes.map((a: any) => ({ id_clase: a.id_clase, id_estudiante: a.id_estudiante, estado: a.estado })),
        calificaciones: []
      }).subscribe({
        next: async (res) => {
          const ids = pendientes.filter((_: any, i: number) => i < (res.data?.asistencias_sincronizadas || pendientes.length)).map((a: any) => a.id).filter(Boolean);
          if (ids.length) await this.offline.markAsistenciaSynced(ids);
          this.pendingCount = (await this.offline.getPendingAsistencias()).length;
          this.addToast('success', `Sincronizado: ${res.data?.asistencias_sincronizadas || ids.length} registros`);
        },
        error: () => this.addToast('error', 'Error de sincronización')
      });
    } catch (e) { this.addToast('error', 'Error al sincronizar'); }
  }

  // ═══════════════════════════════════════════════════════════
  // REPORTES
  // ═══════════════════════════════════════════════════════════

  loadReportes() {
    this.reporteTipo = 'asistencia-general';
    this.reporteCursoId = '';
    this.reporteCursos = [];
    this.reporteData = null;
    this.reporteError = '';
    // Cargar lista de cursos para el selector
    this.http.get<any>(`${this.apiUrl}/cursos`).subscribe({
      next: (res) => { this.reporteCursos = res.data || res; },
      error: () => { this.reporteCursos = []; }
    });
    this.cargarReporte();
  }

  cargarReporte() {
    this.reporteLoading = true;
    this.reporteError = '';
    this.reporteData = null;
    this.reporteColumnas = [];

    let url = '';
    const mapColumns: Record<string, string[]> = {
      'asistencia-general': ['curso', 'total_clases', 'total_asistencias', 'estudiantes_con_asistencia', 'promedio_asistencia_por_clase'],
      'asistencia-por-curso': ['nombre_completo', 'cedula', 'presentes', 'total_clases', 'porcentaje_asistencia'],
      'estudiantes-por-genero': ['genero', 'total_estudiantes', 'porcentaje'],
    };

    this.reporteColumnas = mapColumns[this.reporteTipo] || [];

    if (this.reporteTipo === 'asistencia-general') {
      url = `${this.apiUrl}/reportes/asistencia-general`;
    } else if (this.reporteTipo === 'asistencia-por-curso') {
      if (!this.reporteCursoId) {
        this.reporteLoading = false;
        this.reporteError = 'Selecciona un curso';
        return;
      }
      url = `${this.apiUrl}/reportes/asistencia-por-curso/${this.reporteCursoId}`;
    } else if (this.reporteTipo === 'estudiantes-por-genero') {
      url = `${this.apiUrl}/reportes/estudiantes-por-genero`;
    }

    if (!url) { this.reporteLoading = false; return; }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.reporteData = res.data || [];
        this.reporteLoading = false;
      },
      error: (err) => {
        this.reporteData = null;
        this.reporteError = err.error?.message || 'Error al generar reporte';
        this.reporteLoading = false;
      }
    });
  }

  descargarReporteCSV() {
    if (!this.reporteData || !this.reporteColumnas.length) return;

    const header = this.reporteColumnas.join(',');
    const rows = this.reporteData.map((row: any) =>
      this.reporteColumnas.map(col => {
        const val = row[col] ?? '';
        const str = String(val);
        return /[,"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const tipoLabel: Record<string, string> = {
      'asistencia-general': 'asistencia-general',
      'asistencia-por-curso': 'asistencia-por-curso',
      'estudiantes-por-genero': 'estudiantes-por-genero',
    };
    link.download = `reporte-${tipoLabel[this.reporteTipo] || this.reporteTipo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
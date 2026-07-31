import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { OfflineStorageService } from '../../core/services/offline-storage.service';

interface SesionAsistencia {
  id_sesion: number;
  id_clase: number;
  fecha: string;
  estado: 'abierta' | 'cerrada';
  total_presentes: number;
  total_ausentes: number;
  total_justificados: number;
}

interface Alumno {
  id_usuario: number;
  nombre_completo: string;
  cedula: string;
  estado_asistencia?: 'presente' | 'ausente' | 'justificado' | null;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>✅ Control de Asistencia</h1>
      <p class="page-subtitle">Registro diario de asistencia por sesión</p>
    </div>

    @if (syncMessage()) {
      <div class="alert" [class.alert-success]="syncSuccess()" [class.alert-error]="!syncSuccess()">
        {{ syncMessage() }}
      </div>
    }

    <div class="toolbar">
      <label for="claseSelect" class="form-label">Clase:</label>
      <select id="claseSelect"
              [ngModel]="claseActual()"
              (ngModelChange)="onSeleccionarClase($event)"
              class="form-input">
        @for (clase of clases(); track clase.id_clase) {
          <option [value]="clase.id_clase">{{ clase.titulo }} ({{ clase.curso_nombre }})</option>
        }
        @empty {
          <option [value]="1">Clase por defecto</option>
        }
      </select>
    </div>

    <div class="session-bar">
      @if (sesionActual(); as sesion) {
        <div class="session-info">
          <span>Sesión del día: <strong>{{ sesion.fecha }}</strong></span>
          <span class="session-estado" [class.cerrada]="sesion.estado === 'cerrada'">
            {{ sesion.estado === 'cerrada' ? '🔒 Cerrada' : '🔓 Abierta' }}
          </span>
        </div>
      } @else {
        <div class="session-info">
          <span class="session-estado cerrada">No hay sesión abierta para hoy</span>
        </div>
      }

      <div class="session-actions">
        <button class="btn" [disabled]="abiendoSesion() || !!sesionActual()" (click)="abrirAsistencia()">
          {{ abiendoSesion() ? 'Abriendo...' : 'Abrir asistencia del día' }}
        </button>
        <button class="btn btn-cerrar" [disabled]="!sesionActual() || sesionActual()?.estado === 'cerrada' || cerrandoSesion()" (click)="cerrarAsistencia()">
          {{ cerrandoSesion() ? 'Cerrando...' : 'Cerrar asistencia y contabilizar' }}
        </button>
      </div>
    </div>

    @if (sesionActual()?.estado === 'cerrada') {
      <div class="alert alert-warning">La asistencia de hoy ya fue cerrada. No se pueden modificar los estados.</div>
    }

    <div class="totales-bar">
      <span class="total presente">Presentes: {{ totales().presentes }}</span>
      <span class="total ausente">Ausentes: {{ totales().ausentes }}</span>
      <span class="total justificado">Justificados: {{ totales().justificados }}</span>
      <span class="total sin-marcar">Sin marcar: {{ totales().sinMarcar }}</span>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Cédula</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="4" class="text-center">Cargando...</td></tr>
          }
          @for (alumno of alumnos(); track alumno.id_usuario) {
            <tr>
              <td>{{ alumno.nombre_completo }}</td>
              <td>{{ alumno.cedula }}</td>
              <td>
                <span class="estado-badge" [class]="'estado-' + (alumno.estado_asistencia || 'sin-marcar')">
                  {{ labelEstado(alumno.estado_asistencia) }}
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-presente"
                        [disabled]="!puedeMarcar()"
                        (click)="marcar(alumno.id_usuario, 'presente')">✓ Presente</button>
                <button class="btn-sm btn-ausente"
                        [disabled]="!puedeMarcar()"
                        (click)="marcar(alumno.id_usuario, 'ausente')">✗ Ausente</button>
                <button class="btn-sm btn-justificado"
                        [disabled]="!puedeMarcar()"
                        (click)="marcar(alumno.id_usuario, 'justificado')">📝 Justificado</button>
              </td>
            </tr>
          }
          @empty {
            <tr><td colspan="4" class="text-center">No hay estudiantes en esta clase</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .toolbar { margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .form-label { color: var(--text-primary); font-weight: 500; }
    .form-input { padding: 0.65rem 1rem; border: 1px solid var(--glass-border); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); }
    .session-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--glass-border); }
    .session-info { display: flex; align-items: center; gap: 1rem; color: var(--text-primary); }
    .session-estado { font-weight: 600; color: #22c55e; }
    .session-estado.cerrada { color: #ef4444; }
    .session-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn { padding: 0.6rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; background: rgba(59,130,246,0.2); color: #3b82f6; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-cerrar { background: rgba(239,68,68,0.2); color: #ef4444; }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .alert-warning { background: rgba(249,168,37,0.15); color: var(--accent); border: 1px solid rgba(249,168,37,0.3); }
    .alert-success { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
    .alert-error { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .totales-bar { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .total { padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    .total.presente { background: rgba(34,197,94,0.2); color: #22c55e; }
    .total.ausente { background: rgba(239,68,68,0.2); color: #ef4444; }
    .total.justificado { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .total.sin-marcar { background: rgba(148,163,184,0.2); color: #94a3b8; }
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--glass-border); color: var(--text-primary); }
    .data-table th { font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
    .text-center { text-align: center; color: var(--text-secondary); }
    .estado-badge { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; }
    .estado-presente { background: rgba(34,197,94,0.2); color: #22c55e; }
    .estado-ausente { background: rgba(239,68,68,0.2); color: #ef4444; }
    .estado-justificado { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .estado-sin-marcar { background: rgba(148,163,184,0.2); color: #94a3b8; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-sm { padding: 0.35rem 0.75rem; border-radius: 6px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
    .btn-sm:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-presente { background: rgba(34,197,94,0.2); color: #22c55e; }
    .btn-ausente { background: rgba(239,68,68,0.2); color: #ef4444; }
    .btn-justificado { background: rgba(59,130,246,0.2); color: #3b82f6; }
  `]
})
export class AttendanceComponent implements OnInit {
  private http = inject(HttpClient);
  private offline = inject(OfflineStorageService);
  private apiUrl = environment.apiUrl;

  clases = signal<any[]>([]);
  claseActual = signal<number>(1);
  sesionActual = signal<SesionAsistencia | null>(null);
  alumnos = signal<Alumno[]>([]);
  loading = signal(false);
  abiendoSesion = signal(false);
  cerrandoSesion = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(true);

  totales = computed(() => {
    const lista = this.alumnos();
    return {
      presentes: lista.filter(a => a.estado_asistencia === 'presente').length,
      ausentes: lista.filter(a => a.estado_asistencia === 'ausente').length,
      justificados: lista.filter(a => a.estado_asistencia === 'justificado').length,
      sinMarcar: lista.filter(a => !a.estado_asistencia).length,
    };
  });

  ngOnInit() {
    this.loadClases();
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadClases() {
    this.http.get<any>(`${this.apiUrl}/clases/mis-clases`).subscribe({
      next: (res) => {
        const lista = res.data || [];
        this.clases.set(lista);
        if (lista.length > 0) {
          this.claseActual.set(lista[0].id_clase);
        }
        this.loadSesionHoy();
      },
      error: () => {
        this.clases.set([]);
        this.loadSesionHoy();
      }
    });
  }

  onSeleccionarClase(idClase: string | number) {
    const idClaseNumerico = Number(idClase);
    this.claseActual.set(idClaseNumerico);
    this.sesionActual.set(null);
    this.alumnos.set([]);
    this.loadSesionHoy();
  }

  loadSesionHoy() {
    const idClase = this.claseActual();
    if (!idClase || idClase <= 0) return;

    this.http.get<any>(`${this.apiUrl}/asistencia/sesiones/${idClase}/hoy`).subscribe({
      next: (res) => {
        this.sesionActual.set(res.data || null);
        this.loadAlumnos();
      },
      error: () => {
        this.sesionActual.set(null);
        this.loadAlumnos();
      }
    });
  }

  abrirAsistencia() {
    const idClase = this.claseActual();
    if (!idClase || idClase <= 0) return;

    this.abiendoSesion.set(true);
    this.syncMessage.set('');

    this.http.post<any>(`${this.apiUrl}/asistencia/sesiones`, { id_clase: idClase }).subscribe({
      next: (res) => {
        this.sesionActual.set(res.data);
        this.abiendoSesion.set(false);
        this.loadAlumnos();
      },
      error: (err) => {
        this.abiendoSesion.set(false);
        this.syncSuccess.set(false);
        this.syncMessage.set(err?.error?.message || 'Error al abrir la asistencia del día');
      }
    });
  }

  async loadAlumnos() {
    const idClase = this.claseActual();
    if (!idClase || idClase <= 0) {
      this.alumnos.set([]);
      return;
    }

    this.loading.set(true);

    this.http.get<any>(`${this.apiUrl}/clases/${idClase}/estudiantes`).subscribe({
      next: async (res) => {
        const lista: Alumno[] = (res.data || []).map((u: any) => ({
          id_usuario: u.id_usuario,
          nombre_completo: u.nombre_completo,
          cedula: u.cedula,
          estado_asistencia: null,
        }));
        this.alumnos.set(lista);
        if (this.sesionActual()) {
          await this.mergeAsistenciasSesion();
        }
        await this.mergeAsistenciasLocales();
        this.loading.set(false);
      },
      error: () => {
        this.alumnos.set([]);
        this.loading.set(false);
      }
    });
  }

  private async mergeAsistenciasLocales() {
    const sesion = this.sesionActual();
    if (!sesion) return;

    const guardadas = await this.offline.getAsistenciasBySesion(sesion.id_sesion);
    const porEstudiante = new Map<number, 'presente' | 'ausente' | 'justificado'>();
    for (const g of guardadas) {
      porEstudiante.set(g.id_estudiante, g.estado);
    }

    this.alumnos.update(lista =>
      lista.map(a => porEstudiante.has(a.id_usuario)
        ? { ...a, estado_asistencia: porEstudiante.get(a.id_usuario)! }
        : a)
    );
  }

  private async mergeAsistenciasSesion(): Promise<void> {
    const sesion = this.sesionActual();
    if (!sesion) return;

    return new Promise((resolve) => {
      this.http.get<any>(`${this.apiUrl}/asistencia/sesiones/${sesion.id_sesion}`).subscribe({
        next: async (res) => {
          const asistencias = res.data?.asistencias || [];
          const porEstudiante = new Map<number, 'presente' | 'ausente' | 'justificado'>();
          for (const a of asistencias) {
            porEstudiante.set(a.id_estudiante, a.estado);
            await this.offline.saveAsistencia({
              id_sesion: sesion.id_sesion,
              id_clase: sesion.id_clase,
              id_estudiante: a.id_estudiante,
              estado: a.estado,
              fecha_registro: a.fecha_registro || this.fechaHoy(),
              sincronizado: true,
            });
          }
          this.alumnos.update(lista =>
            lista.map(a => porEstudiante.has(a.id_usuario)
              ? { ...a, estado_asistencia: porEstudiante.get(a.id_usuario)! }
              : a)
          );
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  puedeMarcar(): boolean {
    const sesion = this.sesionActual();
    return !!sesion && sesion.estado === 'abierta' && !this.cerrandoSesion();
  }

  labelEstado(estado?: string | null): string {
    switch (estado) {
      case 'presente': return 'Presente ✅';
      case 'ausente': return 'Ausente ❌';
      case 'justificado': return 'Justificado 📝';
      default: return 'Sin marcar';
    }
  }

  async marcar(idEstudiante: number, estado: 'presente' | 'ausente' | 'justificado') {
    const sesion = this.sesionActual();
    if (!sesion || sesion.estado !== 'abierta') return;

    this.alumnos.update(lista =>
      lista.map(a => a.id_usuario === idEstudiante ? { ...a, estado_asistencia: estado } : a)
    );

    // Intentar guardar directamente en backend; si falla, IndexedDB
    this.http.post<any>(`${this.apiUrl}/asistencia/sesiones/${sesion.id_sesion}/asistencias`, {
      id_estudiante: idEstudiante,
      estado,
    }).subscribe({
      next: async () => {
        await this.offline.saveAsistencia({
          id_sesion: sesion.id_sesion,
          id_clase: sesion.id_clase,
          id_estudiante: idEstudiante,
          estado,
          fecha_registro: this.fechaHoy(),
          sincronizado: true,
        });
      },
      error: async () => {
        await this.offline.saveAsistencia({
          id_sesion: sesion.id_sesion,
          id_clase: sesion.id_clase,
          id_estudiante: idEstudiante,
          estado,
          fecha_registro: this.fechaHoy(),
          sincronizado: false,
        });
        this.syncMessage.set('Sin conexión: asistencia guardada localmente');
        this.syncSuccess.set(false);
      }
    });
  }

  async cerrarAsistencia() {
    const sesion = this.sesionActual();
    if (!sesion || sesion.estado !== 'abierta') return;

    this.cerrandoSesion.set(true);
    this.syncMessage.set('');

    // Sincronizar pendientes de la sesión antes de cerrar
    await this.syncNow(true);

    this.http.post<any>(`${this.apiUrl}/asistencia/sesiones/${sesion.id_sesion}/cerrar`, {}).subscribe({
      next: (res) => {
        this.sesionActual.set(res.data.sesion);
        this.cerrandoSesion.set(false);
        this.syncSuccess.set(true);
        this.syncMessage.set(`Asistencia cerrada. Presentes: ${res.data.totales.presentes}, Ausentes: ${res.data.totales.ausentes}, Justificados: ${res.data.totales.justificados}`);
      },
      error: (err) => {
        this.cerrandoSesion.set(false);
        this.syncSuccess.set(false);
        this.syncMessage.set(err?.error?.message || 'Error al cerrar la asistencia');
      }
    });
  }

  async syncNow(silencioso = false) {
    const sesion = this.sesionActual();
    if (!sesion) return;

    const pending = (await this.offline.getPendingAsistencias()).filter(a => a.id_sesion === sesion.id_sesion);
    if (pending.length === 0) return;

    this.syncing.set(true);
    if (!silencioso) this.syncMessage.set('');

    const payload = {
      asistencias: pending.map(p => ({
        id_sesion: p.id_sesion,
        id_clase: p.id_clase,
        id_estudiante: p.id_estudiante,
        estado: p.estado,
      }))
    };

    return new Promise<void>((resolve) => {
      this.http.post<any>(`${this.apiUrl}/sync`, payload).subscribe({
        next: async () => {
          await this.offline.markAsistenciaSyncedBySesion(sesion.id_sesion, pending.map(p => p.id!));
          this.syncing.set(false);
          if (!silencioso) {
            this.syncSuccess.set(true);
            this.syncMessage.set('Sincronización completada');
          }
          resolve();
        },
        error: (err) => {
          this.syncing.set(false);
          if (!silencioso) {
            this.syncSuccess.set(false);
            this.syncMessage.set(err?.error?.message || 'Error al sincronizar');
          }
          resolve();
        }
      });
    });
  }
}

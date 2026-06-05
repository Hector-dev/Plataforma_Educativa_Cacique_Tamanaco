import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { OfflineStorageService } from '../../core/services/offline-storage.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>✅ Control de Asistencia</h1>
      <p class="page-subtitle">Registro de asistencia de estudiantes</p>
    </div>

    @if (pendingCount > 0) {
      <div class="alert alert-warning">
        ⚠️ {{ pendingCount }} registros pendientes de sincronización.
        <button class="btn-sm" (click)="syncNow()">Sincronizar ahora</button>
      </div>
    }

    <div class="toolbar">
      <select [(ngModel)]="claseActual" (change)="loadAlumnos()" class="form-input">
        <option [value]="1">Clase por defecto</option>
      </select>
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
          @if (loading) {
            <tr><td colspan="4" class="text-center">Cargando...</td></tr>
          }
          @for (alumno of alumnos; track alumno.id_usuario) {
            <tr>
              <td>{{ alumno.nombre_completo }}</td>
              <td>{{ alumno.cedula }}</td>
              <td>
                <span class="estado-badge" [class]="'estado-' + (alumno.estado_asistencia || 'ausente')">
                  {{ alumno.estado_asistencia || 'ausente' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-presente" (click)="marcar(alumno.id_usuario, 'presente')">✓ Presente</button>
                <button class="btn-sm btn-ausente" (click)="marcar(alumno.id_usuario, 'ausente')">✗ Ausente</button>
                <button class="btn-sm btn-justificado" (click)="marcar(alumno.id_usuario, 'justificado')">📝 Justificado</button>
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
    .toolbar { margin-bottom: 1.5rem; }
    .form-input { padding: 0.65rem 1rem; border: 1px solid var(--glass-border); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .alert-warning { background: rgba(249,168,37,0.15); color: var(--accent); border: 1px solid rgba(249,168,37,0.3); }
    .btn-sm { padding: 0.35rem 0.75rem; border-radius: 6px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--glass-border); color: var(--text-primary); }
    .data-table th { font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
    .text-center { text-align: center; color: var(--text-secondary); }
    .estado-badge { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; }
    .estado-presente { background: rgba(34,197,94,0.2); color: #22c55e; }
    .estado-ausente { background: rgba(239,68,68,0.2); color: #ef4444; }
    .estado-justificado { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-presente { background: rgba(34,197,94,0.2); color: #22c55e; }
    .btn-ausente { background: rgba(239,68,68,0.2); color: #ef4444; }
    .btn-justificado { background: rgba(59,130,246,0.2); color: #3b82f6; }
  `]
})
export class AttendanceComponent implements OnInit {
  private http = inject(HttpClient);
  private offline = inject(OfflineStorageService);
  private apiUrl = environment.apiUrl;

  alumnos: any[] = [];
  loading = false;
  pendingCount = 0;
  claseActual = 1;

  ngOnInit() { this.loadAlumnos(); this.checkPending(); }

  loadAlumnos() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/usuarios`).subscribe({
      next: (res) => {
        const all = res.data || [];
        this.alumnos = all.filter((u: any) => u.rol === 'Estudiante' || u.rol === 'estudiante');
        this.loading = false;
        this.loadAsistenciaActual();
      },
      error: () => { this.loading = false; }
    });
  }

  loadAsistenciaActual() {
    // Intenta cargar asistencia existente para esta clase
  }

  async checkPending() {
    const pending = await this.offline.getPendingAsistencias();
    this.pendingCount = pending.length;
  }

  async marcar(idEstudiante: number, estado: string) {
    await this.offline.saveAsistencia({
      id_clase: this.claseActual,
      id_estudiante: idEstudiante,
      estado: estado as any,
      fecha_registro: new Date().toISOString(),
      sincronizado: false,
    });
    // Actualizar UI
    const idx = this.alumnos.findIndex((a: any) => a.id_usuario === idEstudiante);
    if (idx !== -1) { this.alumnos[idx].estado_asistencia = estado; }
    await this.checkPending();
  }

  async syncNow() {
    const pending = await this.offline.getPendingAsistencias();
    this.http.post(`${this.apiUrl}/sync`, { asistencias: pending }).subscribe({
      next: async () => {
        await this.offline.markAsistenciaSynced(pending.map((p: any) => p.id!));
        this.pendingCount = 0;
      },
      error: () => {}
    });
  }
}

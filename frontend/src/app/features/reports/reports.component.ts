import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>📈 Reportes</h1>
      <p class="page-subtitle">Análisis de rendimiento y asistencia</p>
    </div>

    <div class="report-controls">
      <select [(ngModel)]="reporteTipo" (change)="onTipoChange()" class="form-input">
        <option value="asistencia-general">Asistencia General</option>
        <option value="asistencia-curso">Asistencia por Curso</option>
        <option value="rendimiento-curso">Rendimiento por Curso</option>
        <option value="genero">Asistencia por Género</option>
      </select>

      @if (reporteTipo === 'rendimiento-curso' || reporteTipo === 'asistencia-curso') {
        <select [(ngModel)]="reporteCursoId" (change)="loadReporte()" class="form-input">
          <option value="">Seleccionar curso...</option>
          @for (c of reporteCursos; track c.id_curso) {
            <option [value]="c.id_curso">{{ c.nombre }}</option>
          }
        </select>
      }

      <button class="btn-primary" (click)="loadReporte()">🔍 Generar Reporte</button>
      @if (reporteData && reporteData.length > 0) {
        <button class="btn-secondary" (click)="descargarCSV()">📥 Descargar CSV</button>
      }
    </div>

    @if (reporteError) {
      <div class="alert alert-error">{{ reporteError }}</div>
    }

    @if (reporteData && reporteData.length > 0) {
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              @for (col of reporteColumnas; track col) { <th>{{ col }}</th> }
            </tr>
          </thead>
          <tbody>
            @for (row of reporteData; track $index) {
              <tr>
                @for (col of reporteColumnas; track col) {
                  <td>{{ row[col] }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (reporteData && reporteData.length === 0) {
      <p class="empty-state">No se encontraron datos para este reporte.</p>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .report-controls { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
    .form-input { padding: 0.65rem 1rem; border: 1px solid var(--glass-border); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); }
    .btn-primary { padding: 0.65rem 1.25rem; background: var(--accent); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { padding: 0.65rem 1.25rem; background: var(--bg-lighter); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: 8px; cursor: pointer; }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .alert-error { background: rgba(239,68,68,0.15); color: #ef4444; }
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--glass-border); color: var(--text-primary); }
    .data-table th { font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
    .empty-state { text-align: center; color: var(--text-secondary); padding: 3rem; }
  `]
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  reporteTipo = 'asistencia-general';
  reporteCursoId = '';
  reporteCursos: any[] = [];
  reporteError = '';
  reporteData: any[] | null = null;
  reporteColumnas: string[] = [];

  ngOnInit() {
    this.http.get<any>(`${this.apiUrl}/cursos`).subscribe({
      next: (res) => { this.reporteCursos = res.data || res; }
    });
  }

  onTipoChange() { this.reporteData = null; this.reporteError = ''; }

  loadReporte() {
    this.reporteError = '';
    this.reporteData = null;

    const tipo = this.reporteTipo;
    const idCurso = this.reporteCursoId;

    if ((tipo === 'rendimiento-curso' || tipo === 'asistencia-curso') && !idCurso) {
      this.reporteError = 'Seleccione un curso';
      return;
    }

    let url = '';
    switch (tipo) {
      case 'asistencia-general': url = `${this.apiUrl}/reportes/asistencia-general`; break;
      case 'asistencia-curso': url = `${this.apiUrl}/reportes/asistencia-curso/${idCurso}`; break;
      case 'rendimiento-curso': url = `${this.apiUrl}/reportes/rendimiento/${idCurso}`; break;
      case 'genero': url = `${this.apiUrl}/reportes/genero`; break;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.reporteData = res.data || [];
        if (this.reporteData && this.reporteData.length > 0) {
          this.reporteColumnas = Object.keys(this.reporteData[0]);
        }
      },
      error: (err) => { this.reporteError = err.error?.message || 'Error al cargar'; }
    });
  }

  descargarCSV() {
    if (!this.reporteData || this.reporteData.length === 0) return;
    const cols = this.reporteColumnas;
    const header = cols.join(',');
    const rows = this.reporteData.map((r: any) => cols.map((c: string) => `"${String(r[c] || '').replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reporte-${this.reporteTipo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
}

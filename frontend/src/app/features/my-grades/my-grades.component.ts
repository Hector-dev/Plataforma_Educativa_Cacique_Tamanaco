import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-my-grades',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>📝 Mis Notas</h1>
      <p class="page-subtitle">{{ user?.nombre_completo }} · {{ user?.rol }}</p>
    </div>

    @if (loading) {
      <p class="info-text">Cargando notas...</p>
    } @else if (error) {
      <p class="alert-error">{{ error }}</p>
    } @else if (notasPorCurso.length === 0) {
      <p class="info-text">No tienes notas registradas aún.</p>
    } @else {
      <div class="notas-list">
        @for (grupo of notasPorCurso; track grupo.id_curso) {
          <div class="nota-curso">
            <button class="nota-curso-header" (click)="toggleNotasCurso(grupo)">
              <span>{{ grupo.curso }}</span>
              <span class="toggle">{{ grupo.abierto ? '▲' : '▼' }}</span>
            </button>
            @if (grupo.abierto) {
              <div class="nota-curso-body">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Evaluación</th>
                      <th>Clase</th>
                      <th>Tipo</th>
                      <th>Nota</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of grupo.items; track item.id_evaluacion) {
                      <tr>
                        <td>{{ item.evaluacion }}</td>
                        <td>{{ item.clase }}</td>
                        <td>{{ item.tipo_evaluacion || 'evaluación' }}</td>
                        <td class="nota-valor">{{ notaFinal(item) }}</td>
                        <td>{{ item.observaciones || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .info-text { color: var(--text-secondary); font-size: 0.95rem; }
    .alert-error { color: #ef4444; background: rgba(239,68,68,0.1); padding: 0.75rem 1rem; border-radius: var(--radius-md); }
    .notas-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .nota-curso { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-md); overflow: hidden; }
    .nota-curso-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.95rem 1.25rem; background: var(--bg-input); border: none; color: var(--text-primary); font-size: 1.05rem; font-weight: 600; cursor: pointer; text-align: left; }
    .nota-curso-header:hover { background: var(--bg-lighter); }
    .nota-curso-header .toggle { color: var(--text-muted); }
    .nota-curso-body { padding: 1.25rem; }
    .nota-valor { font-weight: 700; color: var(--primary-gold); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--glass-border); text-align: left; color: var(--text-primary); }
    .data-table th { background: var(--bg-input); color: var(--text-secondary); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
    .data-table tbody tr:last-child td { border-bottom: none; }
  `]
})
export class MyGradesComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  user = this.authService.getUser();
  misNotas: any[] = [];
  notasPorCurso: { id_curso: number; curso: string; abierto: boolean; items: any[] }[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    this.cargarMisNotas();
  }

  cargarMisNotas() {
    this.loading = true;
    this.error = '';
    this.http.get<any>(`${this.apiUrl}/evaluaciones/mis-notas`).subscribe({
      next: (res) => {
        this.misNotas = res.data || [];
        this.agruparNotasPorCurso();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al cargar las notas';
        this.loading = false;
      }
    });
  }

  agruparNotasPorCurso() {
    const mapa = new Map<number, { id_curso: number; curso: string; items: any[] }>();
    for (const item of this.misNotas) {
      if (!mapa.has(item.id_curso)) {
        mapa.set(item.id_curso, { id_curso: item.id_curso, curso: item.curso, items: [] });
      }
      mapa.get(item.id_curso)!.items.push(item);
    }
    this.notasPorCurso = Array.from(mapa.values()).map(g => ({ ...g, abierto: false }));
  }

  toggleNotasCurso(grupo: any) {
    grupo.abierto = !grupo.abierto;
  }

  notaFinal(item: any): string | number {
    if (item.tipo_evaluacion?.toLowerCase() === 'quiz' && item.quiz_nota !== null && item.quiz_nota !== undefined) {
      return item.quiz_nota;
    }
    if (item.nota_definitiva !== null && item.nota_definitiva !== undefined) return item.nota_definitiva;
    if (item.nota_preliminar !== null && item.nota_preliminar !== undefined) return item.nota_preliminar;
    return '—';
  }
}

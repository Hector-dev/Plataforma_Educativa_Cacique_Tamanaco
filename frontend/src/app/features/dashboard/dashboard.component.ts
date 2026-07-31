import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <!-- Admin/Docente Dashboard -->
    @if (!isEstudiante) {
      <div class="page-header">
        <h1>📊 Bienvenido, {{ user?.nombre_completo || 'Administrador' }}</h1>
        <p class="page-subtitle">Panel de control · {{ user?.rol }}</p>
      </div>

      <div class="kpi-grid">
        @for (card of kpiCards; track card.label) {
          <div class="kpi-card">
            <span class="kpi-icon">{{ card.icon }}</span>
            <div class="kpi-info">
              <span class="kpi-value">{{ card.value }}</span>
              <span class="kpi-label">{{ card.label }}</span>
            </div>
          </div>
        }
      </div>

      <div class="chart-container">
        <h2>Asistencia Semanal</h2>
        <div class="chart-wrapper">
          <canvas id="asistenciaChart"></canvas>
        </div>
      </div>

      <div class="section">
        <h2>Cursos</h2>
        @if (cursos.length > 0) {
          <div class="courses-list">
            @for (curso of cursos; track curso.id_curso) {
              <div class="course-card">
                <h3>{{ curso.nombre }}</h3>
                <p>{{ curso.descripcion || 'Sin descripción' }}</p>
                <span class="meta">Docente: {{ curso.docente_nombre || 'Sin asignar' }}</span>
              </div>
            }
          </div>
        } @else {
          <p class="info-text">No hay cursos registrados.</p>
        }
      </div>
    }

    <!-- Estudiante Dashboard -->
    @if (isEstudiante) {
      <div class="page-header">
        <h1>📚 Mis Cursos</h1>
        <p class="page-subtitle">Estudiante · {{ user?.nombre_completo }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-icon">📖</span>
          <div class="kpi-info">
            <span class="kpi-value">{{ misCursos.length }}</span>
            <span class="kpi-label">Cursos Inscritos</span>
          </div>
        </div>
        @if (miAsistencia) {
          <div class="kpi-card">
            <span class="kpi-icon">✅</span>
            <div class="kpi-info">
              <span class="kpi-value">{{ miAsistencia.totalAsistencias }}</span>
              <span class="kpi-label">Asistencias esta semana</span>
            </div>
          </div>
        }
      </div>

      @if (misCursos.length > 0) {
        <div class="courses-list">
          @for (curso of misCursos; track curso.id_curso) {
            <a [routerLink]="['/cursos', curso.id_curso, 'estudiar']" class="course-card course-link">
              <h3>{{ curso.nombre }}</h3>
              <p>{{ curso.docente_nombre || 'Sin docente' }}</p>
              <span class="badge">{{ curso.estado_matricula }}</span>
            </a>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .kpi-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
    .kpi-icon { font-size: 2rem; }
    .kpi-info { display: flex; flex-direction: column; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
    .kpi-label { font-size: 0.85rem; color: var(--text-secondary); }
    .chart-container { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .chart-container h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .chart-wrapper { height: 300px; }
    .section { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.5rem; }
    .section h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .courses-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .course-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.25rem; }
    .course-card.course-link { display: block; text-decoration: none; transition: border-color var(--transition-fast), transform var(--transition-fast); cursor: pointer; }
    .course-card.course-link:hover { border-color: var(--primary-gold); transform: translateY(-2px); }
    .course-card h3 { font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem; }
    .course-card p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; }
    .course-card .meta { color: var(--text-muted); font-size: 0.8rem; }
    .badge { display: inline-block; background: var(--accent); color: #000; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; margin-top: 0.5rem; }
    .info-text { color: var(--text-secondary); font-size: 0.95rem; }
  `]
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  user: any = null;
  isEstudiante = false;

  kpiCards: any[] = [];
  chart: Chart | null = null;
  cursos: any[] = [];

  misCursos: any[] = [];
  miAsistencia: any = null;

  ngOnInit() {
    this.user = this.authService.getUser();
    const rol = (this.user?.rol || '').toLowerCase();
    this.isEstudiante = rol === 'estudiante';
    this.loadDashboard();
  }

  loadDashboard() {
    if (this.isEstudiante) {
      this.http.get<any>(`${this.apiUrl}/cursos/mis-cursos`).subscribe({
        next: (res) => { this.misCursos = res.data || []; },
        error: () => { this.misCursos = []; }
      });
      this.http.get<any>(`${this.apiUrl}/asistencia/mi-asistencia`).subscribe({
        next: (res) => { this.miAsistencia = res.data; },
        error: () => { this.miAsistencia = null; }
      });
    } else {
      this.http.get<any>(`${this.apiUrl}/cursos`).subscribe({
        next: (cursosRes) => {
          this.cursos = cursosRes.data || cursosRes || [];
          this.http.get<any>(`${this.apiUrl}/usuarios`).subscribe({
            next: (usuariosRes) => {
              const usuarios = usuariosRes.data || usuariosRes;
              const estudiantes = usuarios.filter((u: any) => u.rol === 'Estudiante' || u.rol === 'estudiante').length;
              this.kpiCards = [
                { label: 'Usuarios', value: usuarios.length, icon: '👥' },
                { label: 'Estudiantes', value: estudiantes, icon: '🎓' },
                { label: 'Cursos', value: this.cursos.length, icon: '📚' },
                { label: 'Conectado', value: '✅', icon: '🌐' },
              ];
              setTimeout(() => this.buildChart(), 200);
            },
            error: () => this.setEmptyKPIs()
          });
        },
        error: () => this.setEmptyKPIs()
      });
    }
  }

  private setEmptyKPIs() {
    this.kpiCards = [
      { label: 'Usuarios', value: 0, icon: '👥' }, { label: 'Estudiantes', value: 0, icon: '🎓' },
      { label: 'Cursos', value: 0, icon: '📚' }, { label: 'Conectado', value: '❌', icon: '🌐' },
    ];
    setTimeout(() => this.buildChart(), 200);
  }

  private buildChart() {
    const canvas = document.getElementById('asistenciaChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.chart) this.chart.destroy();
    const textColor = '#94a3b8';
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
        datasets: [{ label: 'Presentes', data: [0, 0, 0, 0, 0], backgroundColor: 'rgba(249,168,37,0.7)', borderColor: '#f9a825', borderWidth: 2, borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true } }
      }
    });
    this.http.get<any>(`${this.apiUrl}/asistencia/semanal`).subscribe({
      next: (res) => {
        const data = res.data || [0, 0, 0, 0, 0];
        if (this.chart) { this.chart.data.datasets[0].data = data; this.chart.update(); }
      },
      error: () => {}
    });
  }
}

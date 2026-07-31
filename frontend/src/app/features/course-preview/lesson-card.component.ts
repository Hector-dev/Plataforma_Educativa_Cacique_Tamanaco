import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface CursoItem {
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

export interface Leccion {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha?: string | null;
  duracionMinutos?: number | null;
  enlaceRecurso?: string | null;
  tipoDiscapacidad?: string | null;
  items: CursoItem[];
}

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="lesson-card" [class.abierta]="leccionAbierta">
      <button class="lesson-header" (click)="toggle.emit()" [attr.aria-expanded]="leccionAbierta">
        <span class="lesson-chevron" [class.rotated]="leccionAbierta">▸</span>
        <span class="lesson-icon">📚</span>
        <span class="lesson-titles">
          <span class="lesson-title">{{ leccion.titulo }}</span>
          <span class="lesson-meta">
            @if (leccion.fecha) { <span class="meta-item">🗓️ {{ leccion.fecha | date:'shortDate' }}</span> }
            @if (leccion.duracionMinutos) { <span class="meta-item">⏱️ {{ leccion.duracionMinutos }} min</span> }
            <span class="meta-item">• {{ leccion.items.length }} {{ leccion.items.length === 1 ? 'actividad' : 'actividades' }}</span>
          </span>
        </span>
        <span class="lesson-toggle-btn">{{ leccionAbierta ? 'Ocultar' : 'Ver' }}</span>
      </button>

      @if (leccionAbierta) {
        <div class="lesson-body">
          @if (leccion.descripcion) {
            <p class="lesson-desc">{{ leccion.descripcion }}</p>
          }
          @if (leccion.tipoDiscapacidad) {
            <span class="discapacidad-badge">♿ Accesible: {{ leccion.tipoDiscapacidad }}</span>
          }

          <div class="lesson-items">
            @for (item of leccion.items; track item.id) {
              <div class="item-row" [class]="'item-' + item.tipo">
                <span class="item-icon">{{ iconoItem(item.tipo) }}</span>
                <div class="item-body">
                  <div class="item-top">
                    <span class="item-title">{{ item.titulo }}</span>
                    <span class="type-badge" [class]="'badge-' + item.tipo">{{ labelTipo(item.tipo) }}</span>
                  </div>
                  @if (item.descripcion) {
                    <p class="item-desc">{{ item.descripcion }}</p>
                  }
                  <div class="item-metas">
                    @if (item.porcentaje) {
                      <span class="item-meta">🎯 Peso: {{ item.porcentaje }}%</span>
                    }
                    @if (item.tipo === 'tarea' && item.formatosPermitidos?.length) {
                      <span class="item-meta">📄 Formatos: {{ item.formatosPermitidos!.join(', ') }}</span>
                    }
                    @if (item.fechaLimite) {
                      <span class="item-meta">⏰ Límite: {{ item.fechaLimite | date:'shortDate' }}</span>
                    }
                    @if (item.tipo === 'material' && item.tipoRecurso) {
                      <span class="item-meta">🔗 Tipo: {{ item.tipoRecurso }}</span>
                    }
                  </div>
                </div>

                <div class="item-actions">
                  @if (isEstudiante) {
                    @if (item.tipo === 'quiz') {
                      <a class="btn-action btn-quiz" [routerLink]="['/quiz', extraerEvaId(item.id)]"
                         [queryParams]="cursoId ? { curso: cursoId } : undefined">🎯 Hacer quiz</a>
                    }
                    @if (item.tipo === 'tarea') {
                      @if (item.entregada) {
                        <span class="badge-entregado">✅ Entregado</span>
                        @if (!vencida(item)) {
                          <button class="btn-action btn-entregar" (click)="abrirEntrega.emit(item)">📤 Cambiar entrega</button>
                        }
                      } @else if (vencida(item)) {
                        <span class="badge-vencida">⛔ Fecha límite vencida</span>
                      } @else {
                        <button class="btn-action btn-entregar" (click)="abrirEntrega.emit(item)">📤 Entregar</button>
                      }
                    }
                    @if (item.tipo === 'material' && item.urlRecurso) {
                      <a class="btn-action btn-view" [href]="sanitizeUrl(item.urlRecurso)" target="_blank" rel="noopener noreferrer">👁️ Ver recurso</a>
                    }
                  } @else {
                    @if (item.tipo === 'evaluacion' || item.tipo === 'quiz') {
                      <button class="btn-action btn-notas" (click)="abrirNotas.emit(item)">Ver notas</button>
                    }
                  }
                </div>
              </div>
            }
            @if (leccion.items.length === 0) {
              <p class="info-text">Esta clase no tiene actividades.</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .lesson-card { background: var(--bg-input); border: 1px solid var(--glass-border); border-radius: var(--radius-md); overflow: hidden; transition: border-color var(--transition-fast); }
    .lesson-card.abierta { border-color: var(--glass-border); }

    .lesson-header { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: transparent; border: none; cursor: pointer; text-align: left; color: var(--text-primary); transition: background var(--transition-fast); }
    .lesson-header:hover { background: var(--glass-highlight); }

    .lesson-chevron { flex-shrink: 0; color: var(--text-muted); font-size: 0.8rem; transition: transform var(--transition-fast); }
    .lesson-chevron.rotated { transform: rotate(90deg); color: var(--primary-gold); }

    .lesson-icon { flex-shrink: 0; font-size: 1.1rem; }

    .lesson-titles { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .lesson-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
    .lesson-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.2rem; }
    .meta-item { color: var(--text-muted); font-size: 0.75rem; }

    .lesson-toggle-btn { flex-shrink: 0; font-size: 0.8rem; font-weight: 600; color: var(--accent); }

    .lesson-body { padding: 0.25rem 1rem 1rem; }
    .lesson-desc { color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 0.6rem; }
    .discapacidad-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.65rem; background: var(--info-bg); color: var(--info); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; margin-bottom: 0.75rem; }

    .lesson-items { display: flex; flex-direction: column; gap: 0.6rem; }

    .item-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem; background: var(--bg-card); border: 1px solid var(--glass-border); border-left-width: 4px; border-radius: var(--radius-md); transition: transform var(--transition-fast), border-color var(--transition-fast); }
    .item-row:hover { transform: translateY(-1px); border-color: var(--glass-border); }
    .item-tarea { border-left-color: #F59E0B; }
    .item-material { border-left-color: #3B82F6; }
    .item-evaluacion { border-left-color: #8B5CF6; }
    .item-quiz { border-left-color: #EC4899; }

    .item-icon { flex-shrink: 0; width: 2.2rem; height: 2.2rem; display: inline-flex; align-items: center; justify-content: center; background: var(--glass-highlight); border-radius: var(--radius-sm); font-size: 1rem; }

    .item-body { flex: 1; min-width: 0; }
    .item-top { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .item-title { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
    .type-badge { padding: 0.15rem 0.55rem; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .badge-tarea { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .badge-material { background: rgba(59,130,246,0.15); color: #60A5FA; }
    .badge-evaluacion { background: rgba(139,92,246,0.15); color: #A78BFA; }
    .badge-quiz { background: rgba(236,72,153,0.15); color: #F472B6; }

    .item-desc { color: var(--text-secondary); font-size: 0.83rem; margin-top: 0.25rem; }
    .item-metas { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.3rem; }
    .item-meta { color: var(--text-muted); font-size: 0.75rem; }

    .item-actions { flex-shrink: 0; display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end; }

    .btn-action { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; text-decoration: none; cursor: pointer; border: none; transition: all var(--transition-fast); }
    .btn-action:hover { transform: translateY(-1px); }
    .btn-quiz { background: linear-gradient(135deg, var(--primary-gold), var(--primary-gold-dark)); color: var(--primary-navy); }
    .btn-entregar { background: linear-gradient(135deg, var(--success), #059669); color: #fff; }
    .btn-view { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; }
    .btn-notas { background: var(--bg-lighter); color: var(--text-primary); border: 1px solid var(--glass-border); }

    .badge-entregado { display: inline-flex; align-items: center; padding: 0.35rem 0.7rem; background: rgba(16,185,129,0.15); color: var(--success); border: 1px solid rgba(16,185,129,0.35); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge-vencida { display: inline-flex; align-items: center; padding: 0.35rem 0.7rem; background: rgba(239,68,68,0.12); color: var(--error); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }

    .info-text { color: var(--text-secondary); font-size: 0.85rem; }

    @media (max-width: 600px) {
      .lesson-header { padding: 0.75rem; gap: 0.55rem; }
      .lesson-title { font-size: 0.88rem; }
      .lesson-toggle-btn { display: none; }
      .item-row { flex-direction: column; }
      .item-actions { width: 100%; justify-content: stretch; }
      .btn-action { flex: 1; justify-content: center; }
    }
  `]
})
export class LessonCardComponent {
  @Input() leccion!: Leccion;
  @Input() isEstudiante = false;
  @Input() leccionAbierta = false;
  @Input() cursoId?: string | null;

  @Output() toggle = new EventEmitter<void>();
  @Output() abrirNotas = new EventEmitter<CursoItem>();
  @Output() abrirEntrega = new EventEmitter<CursoItem>();

  iconoItem(tipo: string): string {
    switch (tipo) {
      case 'tarea': return '📝';
      case 'material': return '📎';
      case 'evaluacion': return '📋';
      case 'quiz': return '🎯';
      default: return '📄';
    }
  }

  labelTipo(tipo: string): string {
    switch (tipo) {
      case 'tarea': return 'Tarea';
      case 'material': return 'Material';
      case 'evaluacion': return 'Evaluación';
      case 'quiz': return 'Quiz';
      default: return 'Actividad';
    }
  }

  extraerEvaId(itemId: string): number {
    const match = itemId.match(/^eva_(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  vencida(item: CursoItem): boolean {
    if (!item.fechaLimite) return false;
    const limite = new Date(item.fechaLimite);
    limite.setHours(23, 59, 59, 999);
    return new Date() > limite;
  }

  sanitizeUrl(url: string): string {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('www.')) return 'https://' + url;
    return url;
  }
}

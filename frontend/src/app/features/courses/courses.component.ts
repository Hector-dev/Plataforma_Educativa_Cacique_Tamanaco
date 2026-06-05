import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-header">
      <h1>📖 Cursos</h1>
      <p class="page-subtitle">Gestión de cursos y editor visual</p>
    </div>
    <div class="courses-actions">
      <a routerLink="/cursos/8/editor" class="btn-primary">✏️ Abrir Editor de Cursos</a>
    </div>
    <p class="info-text">Desde el editor visual puede crear, modificar y estructurar cursos, módulos, lecciones, tareas y quizzes.</p>
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .courses-actions { margin-bottom: 1.5rem; }
    .btn-primary { display: inline-block; padding: 0.85rem 1.5rem; background: var(--primary-gold); color: #000; border: none; border-radius: var(--radius-md); font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn-primary:hover { background: var(--primary-gold-light); }
    .info-text { color: var(--text-secondary); font-size: 0.95rem; }
  `]
})
export class CoursesComponent {}

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UserManagementComponent } from './features/user-management/user-management.component';
import { AttendanceComponent } from './features/attendance/attendance.component';
import { ReportsComponent } from './features/reports/reports.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([
      // ─── Público ────────────────────────────────────
      { path: '', component: LoginComponent },

      // ─── Protegido (cualquier rol autenticado) ─────
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

      // ─── Admin / Docente ────────────────────────────
      { path: 'usuarios', component: UserManagementComponent, canActivate: [authGuard, roleGuard('admin', 'administrador')] },
      { path: 'asistencia', component: AttendanceComponent, canActivate: [authGuard, roleGuard('admin', 'docente', 'administrador')] },
      { path: 'reportes', component: ReportsComponent, canActivate: [authGuard] },

      // ─── Lazy-loaded features ───────────────────────
      {
        path: 'cursos/:id/editor',
        loadComponent: () =>
          import('./features/course-editor/course-editor.component').then(
            (m) => m.CourseEditorComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'quiz/:evaId',
        loadComponent: () =>
          import('./features/quiz-player/quiz-player.component').then(
            (m) => m.QuizPlayerComponent
          ),
        canActivate: [authGuard],
      },

      // ─── Fallback ───────────────────────────────────
      { path: '**', redirectTo: '' },
    ]),
  ],
};
import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UserManagementComponent } from './features/user-management/user-management.component';
import { AttendanceComponent } from './features/attendance/attendance.component';
import { ReportsComponent } from './features/reports/reports.component';
import { CoursesComponent } from './features/courses/courses.component';
import { MyGradesComponent } from './features/my-grades/my-grades.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideRouter([
      // ─── Público ────────────────────────────────────
      { path: '', component: LoginComponent },

      // ─── Protegido (cualquier rol autenticado) ─────
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

      // ─── Admin / Docente ────────────────────────────
      { path: 'usuarios', component: UserManagementComponent, canActivate: [authGuard, roleGuard('admin', 'administrador')] },
      { path: 'asistencia', component: AttendanceComponent, canActivate: [authGuard, roleGuard('admin', 'docente', 'administrador')] },
      { path: 'reportes', component: ReportsComponent, canActivate: [authGuard, roleGuard('admin', 'docente', 'administrador')] },
      { path: 'cursos', component: CoursesComponent, canActivate: [authGuard] },
      { path: 'mis-notas', component: MyGradesComponent, canActivate: [authGuard, roleGuard('estudiante')] },

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
        path: 'cursos/:id/preview',
        loadComponent: () =>
          import('./features/course-preview/course-preview.component').then(
            (m) => m.CoursePreviewComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'cursos/:id/estudiar',
        loadComponent: () =>
          import('./features/course-preview/course-preview.component').then(
            (m) => m.CoursePreviewComponent
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
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([
      {
        path: 'cursos/:id/editor',
        loadComponent: () =>
          import('./features/course-editor/course-editor.component').then(
            (m) => m.CourseEditorComponent
          ),
      },
      {
        path: 'quiz/:evaId',
        loadComponent: () =>
          import('./features/quiz-player/quiz-player.component').then(
            (m) => m.QuizPlayerComponent
          ),
      },
      // Redirigir /cursos/:id a la vista principal de cursos
      {
        path: 'cursos/:id',
        redirectTo: '',
      },
      // La ruta '' la sigue manejando el App component como SPA
    ]),
  ],
};
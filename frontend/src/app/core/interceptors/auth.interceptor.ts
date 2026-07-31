import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const handle401 = () => {
    authService.logout();
    const returnUrl = window.location.pathname !== '/' ? window.location.pathname : '/dashboard';
    router.navigate(['/'], { queryParams: { returnUrl } });
  };

  // El JWT viaja automáticamente en cookie HttpOnly cuando withCredentials=true.
  // No se añade header Authorization manualmente.
  const cloned = req.clone({
    withCredentials: true,
  });

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        handle401();
      }
      return throwError(() => error);
    })
  );
};
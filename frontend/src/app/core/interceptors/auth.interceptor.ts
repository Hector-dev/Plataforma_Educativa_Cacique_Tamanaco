import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Never attach token to login requests
  if (req.url.includes('/usuarios/login')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const handle401 = () => {
    authService.logout();
    const returnUrl = window.location.pathname !== '/' ? window.location.pathname : '/dashboard';
    router.navigate(['/'], { queryParams: { returnUrl } });
  };

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          handle401();
        }
        return throwError(() => error);
      })
    );
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        handle401();
      }
      return throwError(() => error);
    })
  );
};
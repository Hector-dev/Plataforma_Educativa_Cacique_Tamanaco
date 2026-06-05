import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Never attach token to login requests
  if (req.url.includes('/usuarios/login')) {
    return next(req);
  }

  const token = localStorage.getItem('cactam_token');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        // Auto-logout on 401 (expired/invalid token)
        if (error.status === 401) {
          localStorage.removeItem('cactam_token');
          localStorage.removeItem('cactam_user');
          // Reload to show login screen
          window.location.reload();
        }
        return throwError(() => error);
      })
    );
  }

  // For protected routes without token, let the backend respond with 401
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('cactam_token');
        localStorage.removeItem('cactam_user');
        window.location.reload();
      }
      return throwError(() => error);
    })
  );
};
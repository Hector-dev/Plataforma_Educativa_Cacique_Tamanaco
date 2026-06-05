import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AuthGuard — protege rutas que requieren sesión activa.
 * Si no hay token, redirige al login con returnUrl.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = state.url !== '/' ? state.url : '/dashboard';
  router.navigate(['/'], { queryParams: { returnUrl } });
  return false;
};

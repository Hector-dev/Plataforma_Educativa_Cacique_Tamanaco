import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AuthGuard — protege rutas que requieren sesión activa.
 * Si no hay sesión, redirige al login con returnUrl.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Restaurar sesión desde sessionStorage antes de validar (sobrevive a recargas de página)
  authService.restoreSession();

  if (authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = state.url !== '/' ? state.url : '/dashboard';
  router.navigate(['/'], { queryParams: { returnUrl } });
  return false;
};

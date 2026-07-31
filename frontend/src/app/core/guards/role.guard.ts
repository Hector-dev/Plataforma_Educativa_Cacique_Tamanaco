import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * RoleGuard factory — restringe rutas a roles específicos.
 *
 * Uso: `canActivate: [roleGuard('admin', 'docente')]`
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return async (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Restaurar sesión desde sessionStorage antes de validar (sobrevive a recargas de página)
    authService.restoreSession();

    const user = authService.getUser();
    if (!user) {
      const returnUrl = state.url !== '/' ? state.url : '/dashboard';
      router.navigate(['/'], { queryParams: { returnUrl } });
      return false;
    }

    const normRoles = allowedRoles.map((r) => r.toLowerCase());
    const userRole = (user.rol || '').toLowerCase();
    const isAdmin = userRole === 'administrador' || userRole === 'admin';

    // Admin siempre tiene acceso
    if (isAdmin) return true;

    if (normRoles.includes(userRole)) return true;

    router.navigate(['/dashboard']);
    return false;
  };
}

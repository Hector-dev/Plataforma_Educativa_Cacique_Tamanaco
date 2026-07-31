import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let authServiceMock: Partial<AuthService>;
  let routerMock: Partial<Router>;

  beforeEach(() => {
    authServiceMock = {
      restoreSession: vi.fn(),
      getUser: vi.fn(),
    };
    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should restore session before checking role', async () => {
    authServiceMock.getUser = vi.fn().mockReturnValue({ id_usuario: 1, rol: 'docente' });

    const guard = roleGuard('docente');
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as any, { url: '/asistencia' } as any)
    );

    expect(authServiceMock.restoreSession).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should allow admin to access any role-restricted route', async () => {
    authServiceMock.getUser = vi.fn().mockReturnValue({ id_usuario: 1, rol: 'administrador' });

    const guard = roleGuard('docente');
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as any, { url: '/asistencia' } as any)
    );

    expect(result).toBe(true);
  });

  it('should redirect to dashboard when role does not match', async () => {
    authServiceMock.getUser = vi.fn().mockReturnValue({ id_usuario: 1, rol: 'estudiante' });

    const guard = roleGuard('docente');
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as any, { url: '/asistencia' } as any)
    );

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(false);
  });

  it('should redirect to login with returnUrl when no user', async () => {
    authServiceMock.getUser = vi.fn().mockReturnValue(null);

    const guard = roleGuard('docente');
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as any, { url: '/asistencia' } as any)
    );

    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { returnUrl: '/asistencia' },
    });
    expect(result).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceMock: Partial<AuthService>;
  let routerMock: Partial<Router>;

  beforeEach(() => {
    authServiceMock = {
      restoreSession: vi.fn(),
      isAuthenticated: vi.fn(),
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

  it('should restore session before checking authentication', async () => {
    authServiceMock.isAuthenticated = vi.fn().mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any)
    );

    expect(authServiceMock.restoreSession).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should redirect to login when not authenticated', async () => {
    authServiceMock.isAuthenticated = vi.fn().mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/asistencia' } as any)
    );

    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { returnUrl: '/asistencia' },
    });
    expect(result).toBe(false);
  });
});

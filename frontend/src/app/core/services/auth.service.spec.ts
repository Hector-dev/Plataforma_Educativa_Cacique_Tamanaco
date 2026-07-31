import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  it('should start unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getUser()).toBeNull();
  });

  it('should restore session from sessionStorage', () => {
    const user = { id_usuario: 1, nombre_completo: 'Test', email: 'test@test.com', rol: 'docente' };
    sessionStorage.setItem('cactam_user', JSON.stringify(user));

    service.restoreSession();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toEqual(user);
  });

  it('should clear session on logout', () => {
    const user = { id_usuario: 1, nombre_completo: 'Test', email: 'test@test.com', rol: 'docente' };
    sessionStorage.setItem('cactam_user', JSON.stringify(user));

    service.restoreSession();
    service.logout();

    const logoutReq = httpMock.expectOne('/api/usuarios/logout');
    logoutReq.flush({ success: true });

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('cactam_user')).toBeNull();
  });

  it('should logout when sessionStorage user is corrupt', () => {
    sessionStorage.setItem('cactam_user', 'not-json');

    service.restoreSession();

    const logoutReq = httpMock.expectOne('/api/usuarios/logout');
    logoutReq.flush({ success: true });

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('cactam_user')).toBeNull();
  });

  it('should store user after login and send credentials', () => {
    const user = { id_usuario: 2, nombre_completo: 'Doc', email: 'doc@test.com', rol: 'docente' };

    service.login('doc@test.com', 'password').subscribe({
      next: (res) => {
        expect(res.success).toBe(true);
        expect(service.isAuthenticated()).toBe(true);
        expect(service.getUser()).toEqual(user);
      },
    });

    const req = httpMock.expectOne('/api/usuarios/login');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true, user });
  });

  afterEach(() => {
    httpMock.verify();
  });
});

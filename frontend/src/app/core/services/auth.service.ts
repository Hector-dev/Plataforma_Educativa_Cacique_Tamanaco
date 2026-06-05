import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserPayload {
    id_usuario: number;
    nombre_completo: string;
    email: string;
    rol: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    user: UserPayload;
}

export interface AuthState {
    token: string | null;
    user: any | null;
    isAuthenticated: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    // ─── Token en memoria (NO localStorage — evita robo por XSS) ───
    //
    // TODO(auth): Migrar a cookie HttpOnly cuando el backend envíe el
    // token como `Set-Cookie` con flags `HttpOnly; Secure; SameSite=Strict`.
    //
    // Plan de migración:
    //   1. Backend: al hacer login, responder con `Set-Cookie: token=...`
    //      en vez de devolver el token en el body JSON.
    //   2. Backend: endpoint `POST /api/auth/refresh` que lea la cookie
    //      y devuelva una nueva (rotación de token).
    //   3. Backend: endpoint `POST /api/auth/logout` que borre la cookie.
    //   4. Frontend: eliminar `_token` y `_user` de memoria. Usar
    //      `withCredentials: true` en HttpClient para que las cookies
    //      se envíen automáticamente.
    //   5. Frontend: el interceptor `auth.interceptor.ts` dejará de
    //      añadir el header `Authorization` manualmente (el navegador
    //      envía la cookie sola).
    //
    // Mientras tanto, el token se almacena en memoria (no persiste
    // entre recargas de página). Como mitigación parcial, se mantiene
    // también en sessionStorage (se limpia al cerrar pestaña) en vez
    // de localStorage.
    //
    private readonly TOKEN_KEY = 'cactam_token';
    private readonly USER_KEY = 'cactam_user';

    /** Token JWT en memoria (no accesible desde JS malicioso en otra pestaña) */
    private _token: string | null = null;
    private _user: any | null = null;

    login(email: string, password: string): Observable<LoginResponse> {
        console.log('[AuthService] login() called. apiUrl:', this.apiUrl);
        return this.http.post<LoginResponse>(`${this.apiUrl}/usuarios/login`, {
            email,
            password
        }).pipe(
            tap((res: LoginResponse) => {
                console.log('[AuthService] tap() - setSession called. token:', !!res.token, 'user:', res.user?.nombre_completo);
                this.setSession(res);
            }),
            catchError((error: any) => {
                console.error('[AuthService] catchError:', error);
                return throwError(() => error);
            })
        );
    }

    logout(): void {
        console.log('[AuthService] logout()');
        this._token = null;
        this._user = null;
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.USER_KEY);
    }

    getToken(): string | null {
        return this._token;
    }

    getUser(): any | null {
        return this._user;
    }

    isAuthenticated(): boolean {
        return !!this._token;
    }

    restoreSession(): AuthState {
        // Recuperar sesión desde sessionStorage al recargar la página
        if (!this._token) {
            const stored = sessionStorage.getItem(this.TOKEN_KEY);
            if (stored) {
                this._token = stored;
                const userStr = sessionStorage.getItem(this.USER_KEY);
                this._user = userStr ? JSON.parse(userStr) : null;
            }
        }
        return {
            token: this._token,
            user: this._user,
            isAuthenticated: !!this._token
        };
    }

    private setSession(res: LoginResponse): void {
        this._token = res.token;
        this._user = res.user;
        // Respaldo mínimo en sessionStorage para sobrevivir refrescos
        // (se limpia al cerrar la pestaña, más seguro que localStorage)
        sessionStorage.setItem(this.TOKEN_KEY, res.token);
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    }
}
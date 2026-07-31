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
    user: UserPayload;
}

export interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    private readonly USER_KEY = 'cactam_user';

    /** Datos de usuario en memoria. El JWT se mantiene en cookie HttpOnly del backend. */
    private _user: any | null = null;

    login(email: string, password: string): Observable<LoginResponse> {
        console.log('[AuthService] login() called. apiUrl:', this.apiUrl);
        return this.http.post<LoginResponse>(
            `${this.apiUrl}/usuarios/login`,
            { email, password },
            { withCredentials: true }
        ).pipe(
            tap((res: LoginResponse) => {
                console.log('[AuthService] tap() - setSession called. user:', res.user?.nombre_completo);
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
        this.http.post(`${this.apiUrl}/usuarios/logout`, {}, { withCredentials: true }).subscribe();
        this.clearSession();
    }

    getToken(): string | null {
        // El token ya no vive en el frontend; vive en cookie HttpOnly.
        return null;
    }

    getUser(): any | null {
        return this._user;
    }

    isAuthenticated(): boolean {
        return !!this._user;
    }

    restoreSession(): AuthState {
        if (!this._user) {
            try {
                const userStr = sessionStorage.getItem(this.USER_KEY);
                this._user = userStr ? JSON.parse(userStr) : null;
            } catch {
                this.logout();
            }
        }
        return {
            user: this._user,
            isAuthenticated: !!this._user
        };
    }

    private setSession(res: LoginResponse): void {
        this._user = res.user;
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    }

    private clearSession(): void {
        this._user = null;
        sessionStorage.removeItem(this.USER_KEY);
    }
}
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
    private readonly TOKEN_KEY = 'cactam_token';
    private readonly USER_KEY = 'cactam_user';

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
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    getUser(): any | null {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    restoreSession(): AuthState {
        const token = this.getToken();
        const user = this.getUser();
        return {
            token,
            user,
            isAuthenticated: !!token
        };
    }

    private setSession(res: LoginResponse): void {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    }
}
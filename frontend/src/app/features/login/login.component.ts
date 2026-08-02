import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-view">
      <div class="login-card">
        <div class="login-brand">
          <span class="login-logo">
            <img src="icons/logo.png" alt="" class="login-logo-img" />
          </span>
          <h1>Cacique Tamanaco</h1>
          <p>Plataforma Educativa</p>
        </div>
        @if (loginError) {
          <div class="alert alert-error">{{ loginError }}</div>
        }
        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" [(ngModel)]="loginEmail" name="email"
                   placeholder="admin@admin.com" required class="form-input" />
          </div>
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input id="password" type="password" [(ngModel)]="loginPassword" name="password"
                   placeholder="••••••••" required class="form-input" />
          </div>
          <button type="submit" class="btn-primary btn-block" [disabled]="loading">
            @if (loading) { <span class="spinner"></span> Cargando... }
            @else { Iniciar Sesión }
          </button>
        </form>
        <p class="login-footer">Sistema de gestión educativa · v1.0</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg-primary); }
    .login-view { width: 100%; max-width: 420px; padding: 2rem; }
    .login-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 16px; padding: 2.5rem; }
    .login-brand { text-align: center; margin-bottom: 2rem; }
    .login-logo { font-size: 3rem; display: flex; justify-content: center; }
    .login-logo-img { width: 96px; height: 96px; object-fit: contain; }
    .login-brand h1 { font-size: 1.5rem; color: var(--text-primary); margin-top: 0.5rem; }
    .login-brand p { color: var(--text-secondary); font-size: 0.9rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; margin-bottom: 0.35rem; color: var(--text-secondary); font-size: 0.85rem; }
    .form-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--glass-border); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); font-size: 1rem; }
    .btn-block { width: 100%; padding: 0.85rem; margin-top: 0.5rem; }
    .btn-primary { background: var(--accent); color: #000; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .alert-error { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .login-footer { text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 1.5rem; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid transparent; border-top-color: #000; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 0.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loading = false;

  onLogin() {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loading = true;
    this.loginError = '';
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.loginPassword = '';
        // Redirect to returnUrl or dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        this.router.navigateByUrl(returnUrl || '/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.loginError = err.error?.message || 'Error de conexión';
      }
    });
  }
}

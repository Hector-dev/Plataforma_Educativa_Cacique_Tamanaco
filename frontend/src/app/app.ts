import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  icon: string;
  message: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  isDark = true;
  user: any = null;
  token = '';
  sidebarCollapsed = false;
  mobileMenuOpen = false;
  isLoginRoute = true;

  menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/usuarios', icon: '👥', label: 'Usuarios', adminOnly: true },
    { path: '/cursos', icon: '📖', label: 'Cursos' },
    { path: '/asistencia', icon: '✅', label: 'Asistencia', noEstudiante: true },
    { path: '/reportes', icon: '📈', label: 'Reportes' },
  ];

  toasts: Toast[] = [];
  private toastId = 0;
  isStandaloneRoute = false;

  get isAdmin() {
    const rol = (this.user?.rol || '').toLowerCase();
    return rol === 'administrador' || rol === 'admin';
  }

  get isEstudiante() {
    return (this.user?.rol || '').toLowerCase() === 'estudiante';
  }

  get filteredMenuItems() {
    return this.menuItems.filter(item => {
      if (item.adminOnly && !this.isAdmin) return false;
      if (item.noEstudiante && this.isEstudiante) return false;
      return true;
    });
  }

  ngOnInit() {
    this.loadTheme();
    this.syncAuthState();
    this.isLoginRoute = this.isLoginPath(window.location.pathname);
    this.isStandaloneRoute = this.isStandalonePath(window.location.pathname);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.isStandaloneRoute = this.isStandalonePath(e.urlAfterRedirects);
      this.isLoginRoute = this.isLoginPath(e.urlAfterRedirects);
      this.syncAuthState();
    });
  }

  private syncAuthState() {
    if (!this.token) {
      const saved = this.authService.restoreSession();
      if (saved.isAuthenticated) {
        this.token = saved.token!;
        this.user = saved.user;
      }
    }
  }

  private isLoginPath(path: string): boolean {
    const clean = path.split('?')[0];
    return clean === '/' || clean === '';
  }

  private isStandalonePath(path: string): boolean {
    return path.includes('/editor') || path.includes('/quiz');
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) { if (event.key === 'Escape') this.mobileMenuOpen = false; }

  toggleTheme() {
    this.isDark = !this.isDark;
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    localStorage.setItem('cacique_theme', this.isDark ? 'dark' : 'light');
  }

  private loadTheme() {
    const saved = localStorage.getItem('cacique_theme');
    const isDark = saved !== 'light';
    this.isDark = isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  logout() {
    this.authService.logout();
    this.user = null; this.token = '';
    this.mobileMenuOpen = false;
    this.router.navigate(['/']);
  }

  addToast(type: Toast['type'], message: string) {
    const icons: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const id = ++this.toastId;
    this.toasts.push({ id, type, icon: icons[type] || '💬', message });
    setTimeout(() => this.removeToast(id), 4000);
  }

  removeToast(id: number) { this.toasts = this.toasts.filter(t => t.id !== id); }
}

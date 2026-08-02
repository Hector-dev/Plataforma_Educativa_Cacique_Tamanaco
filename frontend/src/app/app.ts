import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { applyTheme, loadTheme } from './core/utils/theme.util';

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
  private toastService = inject(ToastService);

  isDark = true;
  user: any = null;
  sidebarCollapsed = false;
  mobileOpen = false;
  isLoginRoute = true;

  menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/usuarios', icon: '👥', label: 'Usuarios', adminOnly: true },
    { path: '/cursos', icon: '📖', label: 'Cursos' },
    { path: '/asistencia', icon: '✅', label: 'Asistencia', noEstudiante: true },
    { path: '/reportes', icon: '📈', label: 'Reportes', noEstudiante: true },
    { path: '/mis-notas', icon: '📝', label: 'Mis Notas', estudianteOnly: true },
  ];

  readonly toasts = this.toastService.toasts;
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
      if ((item as any).estudianteOnly && !this.isEstudiante) return false;
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
      this.mobileOpen = false;
      this.syncAuthState();
    });
  }

  private syncAuthState() {
    const saved = this.authService.restoreSession();
    if (saved.isAuthenticated) {
      this.user = saved.user;
    }
  }

  private isLoginPath(path: string): boolean {
    const clean = path.split('?')[0];
    return clean === '/' || clean === '';
  }

  private isStandalonePath(path: string): boolean {
    return path.includes('/editor') || path.includes('/quiz');
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    applyTheme(this.isDark);
  }

  toggleMenu() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMenu() {
    this.mobileOpen = false;
  }

  private loadTheme() {
    this.isDark = loadTheme();
  }

  logout() {
    this.authService.logout();
    this.user = null;
    this.router.navigate(['/']);
  }
}

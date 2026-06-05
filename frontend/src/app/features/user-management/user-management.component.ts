import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>👥 Gestión de Usuarios</h1>
      <p class="page-subtitle">Administración de cuentas del sistema</p>
    </div>

    <div class="toolbar">
      <input type="text" [(ngModel)]="searchQuery" (input)="search()" placeholder="Buscar por nombre o email..." class="search-input" />
      <button class="btn-primary" (click)="openCreateModal()">➕ Nuevo Usuario</button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th><th>Email</th><th>Cédula</th><th>Rol</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @if (loading) {
            <tr><td colspan="5" class="text-center">Cargando...</td></tr>
          }
          @for (u of usuarios; track u.id_usuario) {
            <tr>
              <td>{{ u.nombre_completo }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.cedula }}</td>
              <td><span class="rol-badge" [class]="'rol-' + (u.rol || '').toLowerCase()">{{ u.rol }}</span></td>
              <td class="actions">
                <button class="btn-icon-sm" (click)="openEditModal(u)">✏️</button>
                <button class="btn-icon-sm btn-danger" (click)="deleteUser(u.id_usuario)">🗑</button>
              </td>
            </tr>
          }
          @empty {
            <tr><td colspan="5" class="text-center">No se encontraron usuarios</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (totalPages > 1) {
      <div class="pagination">
        <button [disabled]="page <= 1" (click)="goPage(page - 1)">« Anterior</button>
        <span>Página {{ page }} de {{ totalPages }}</span>
        <button [disabled]="page >= totalPages" (click)="goPage(page + 1)">Siguiente »</button>
      </div>
    }

    <!-- Modal -->
    @if (modalOpen) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <h2>{{ editingUser ? 'Editar' : 'Crear' }} Usuario</h2>
          <form (ngSubmit)="saveUser()">
            <div class="form-group"><label>Nombre *</label><input [(ngModel)]="form.nombre_completo" name="nombre" required class="form-input" /></div>
            <div class="form-group"><label>Email *</label><input [(ngModel)]="form.email" name="email" type="email" required class="form-input" /></div>
            <div class="form-group"><label>Cédula *</label><input [(ngModel)]="form.cedula" name="cedula" required class="form-input" /></div>
            <div class="form-group"><label>Rol *</label>
              <select [(ngModel)]="form.rol" name="rol" required class="form-input">
                <option value="Estudiante">Estudiante</option>
                <option value="Docente">Docente</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
            @if (!editingUser) {
              <div class="form-group"><label>Contraseña *</label><input [(ngModel)]="form.password" name="password" type="password" required class="form-input" /></div>
            }
            <div class="form-group"><label>Género</label>
              <select [(ngModel)]="form.genero" name="genero" class="form-input">
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="form-group"><label>Edad</label><input [(ngModel)]="form.edad" name="edad" type="number" class="form-input" /></div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-primary">{{ editingUser ? 'Guardar' : 'Crear' }}</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: var(--text-primary); }
    .page-subtitle { color: var(--text-secondary); margin-top: 0.25rem; }
    .toolbar { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-input { flex: 1; min-width: 200px; padding: 0.65rem 1rem; border: 1px solid var(--glass-border); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); }
    .btn-primary { padding: 0.65rem 1.25rem; background: var(--accent); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { padding: 0.65rem 1.25rem; background: var(--bg-lighter); color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: 8px; cursor: pointer; }
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--glass-border); color: var(--text-primary); }
    .data-table th { font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; }
    .text-center { text-align: center; color: var(--text-secondary); }
    .rol-badge { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; }
    .rol-administrador { background: rgba(239,68,68,0.2); color: #ef4444; }
    .rol-admin { background: rgba(239,68,68,0.2); color: #ef4444; }
    .rol-docente { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .rol-estudiante { background: rgba(34,197,94,0.2); color: #22c55e; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-icon-sm { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.25rem; }
    .btn-danger:hover { background: rgba(239,68,68,0.15); border-radius: 6px; }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; color: var(--text-secondary); }
    .pagination button { padding: 0.5rem 1rem; background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); cursor: pointer; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
    .modal-dialog { background: var(--bg-card); border-radius: 12px; padding: 2rem; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
    .modal-dialog h2 { margin-bottom: 1.5rem; color: var(--text-primary); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.3rem; color: var(--text-secondary); font-size: 0.85rem; }
    .form-input { width: 100%; padding: 0.65rem; border: 1px solid var(--glass-border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  `]
})
export class UserManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  usuarios: any[] = [];
  loading = false;
  searchQuery = '';
  page = 1;
  limit = 20;
  totalPages = 1;
  modalOpen = false;
  editingUser: any = null;
  form: any = {};

  ngOnInit() { this.loadUsuarios(); }

  loadUsuarios() {
    this.loading = true;
    const params = new URLSearchParams({ page: String(this.page), limit: String(this.limit) });
    if (this.searchQuery) params.set('search', this.searchQuery);
    this.http.get<any>(`${this.apiUrl}/usuarios?${params}`).subscribe({
      next: (res) => { this.usuarios = res.data || []; this.totalPages = res.totalPages || 1; this.loading = false; },
      error: () => { this.usuarios = []; this.loading = false; }
    });
  }

  search() { this.page = 1; this.loadUsuarios(); }
  goPage(p: number) { this.page = p; this.loadUsuarios(); }

  openCreateModal() {
    this.editingUser = null;
    this.form = { nombre_completo: '', email: '', cedula: '', rol: 'Estudiante', password: '', genero: '', edad: '' };
    this.modalOpen = true;
  }

  openEditModal(user: any) {
    this.editingUser = user;
    this.form = { ...user };
    this.modalOpen = true;
  }

  closeModal() { this.modalOpen = false; }

  saveUser() {
    if (this.editingUser) {
      this.http.put(`${this.apiUrl}/usuarios/${this.editingUser.id_usuario}`, this.form).subscribe({
        next: () => { this.closeModal(); this.loadUsuarios(); },
        error: (err) => alert(err.error?.message || 'Error al guardar')
      });
    } else {
      this.http.post(`${this.apiUrl}/usuarios`, this.form).subscribe({
        next: () => { this.closeModal(); this.loadUsuarios(); },
        error: (err) => alert(err.error?.message || 'Error al crear')
      });
    }
  }

  deleteUser(id: number) {
    if (!confirm('¿Eliminar este usuario?')) return;
    this.http.delete(`${this.apiUrl}/usuarios/${id}`).subscribe({
      next: () => this.loadUsuarios(),
      error: (err) => alert(err.error?.message || 'Error al eliminar')
    });
  }
}

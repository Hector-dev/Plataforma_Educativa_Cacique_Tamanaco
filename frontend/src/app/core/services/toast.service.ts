import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  icon: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private toastId = 0;

  show(type: Toast['type'], message: string): void {
    const icons: Record<Toast['type'], string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    const id = ++this.toastId;
    this.toasts.update((ts) => [...ts, { id, type, icon: icons[type], message }]);
    setTimeout(() => this.remove(id), 4000);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  remove(id: number): void {
    this.toasts.update((ts) => ts.filter((t) => t.id !== id));
  }
}

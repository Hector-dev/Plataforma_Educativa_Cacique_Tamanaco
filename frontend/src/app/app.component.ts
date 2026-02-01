import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header class="bg-white shadow">
        <div class="container py-4 flex items-center justify-between">
          <h1 class="text-xl font-semibold">Cacique Tamanaco</h1>
          <nav aria-label="Main navigation">
            <ul class="flex gap-4">
              <li><a class="hover:underline" href="#">Inicio</a></li>
              <li><a class="hover:underline" href="#">Clases</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main class="flex-1 container py-6">
        <section>
          <h2 class="text-2xl font-bold mb-4">Lección de ejemplo</h2>
          <app-lesson></app-lesson>
        </section>
      </main>

      <footer class="bg-white border-t">
        <div class="container py-4 text-sm text-gray-600">© Cacique Tamanaco</div>
      </footer>
    </div>
  `,
  styles: [``],
})
export class AppComponent {}

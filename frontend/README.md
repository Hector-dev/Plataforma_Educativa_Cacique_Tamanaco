Frontend (Angular PWA) — Cacique Tamanaco

Crear la app Angular PWA y añadir NGXS + wrappers de IndexedDB.

Comandos sugeridos:
```bash
# Crear la app
npx @angular/cli new frontend --routing --style=scss
cd frontend
ng add @angular/pwa
npm install @ngxs/store idb
```

Notas:
- Seguir WCAG 2.1: usar atributos ARIA y roles en componentes.
- Implementar servicio de sincronización Web Bluetooth que intercambie JSON.
- Persistencia local: IndexedDB para datos masivos y NGXS para estado.

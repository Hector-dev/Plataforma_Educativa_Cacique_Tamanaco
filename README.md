Sistema Educativo Cacique Tamanaco — Monolito Modular

Estructura inicial:
- frontend/  (Angular PWA, NGXS, IndexedDB)
- backend/   (NestJS)

Pasos rápidos:
1. Base de datos: ya disponible (PostgreSQL). Ajusta `DATABASE_URL` si usas `docker-compose`.

Backend (desarrollo):
```bash
cd backend
npm install
npm run start:dev
```

Frontend (desarrollo - generar con Angular CLI):
```bash
# crear app angular PWA si no existe
npx @angular/cli new frontend --style=scss --routing=true
cd frontend
npm install @ngxs/store idb-keyval
npm run start
```

Siguientes pasos recomendados:
- Implementar módulos NestJS (users, auth, academico, evaluacion, admin)
- Generar migrations basadas en `schema_postgres_offline_first.sql`
- Implementar IndexedDB wrappers y NGXS para estado local
- Diseñar protocolo JSON para sincronización por Web Bluetooth

Enfoque Web-first
- El proyecto se prioriza como aplicación web progresiva (PWA) para funcionamiento óptimo en navegadores de escritorio y tabletas.
- Más adelante se implementará una adaptación móvil nativa mediante Capacitor (o Ionic) para Android/iOS; la PWA permite avanzar rápidamente en funcionalidad y accesibilidad.
- Recomendación para la migración móvil: usar `@capacitor/core` y exponer adaptadores nativos para Bluetooth cuando sea necesario (Android tiene mejor soporte nativo; iOS puede requerir permisos y adaptadores específicos).

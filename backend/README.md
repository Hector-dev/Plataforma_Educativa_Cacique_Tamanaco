Backend (NestJS) — Cacique Tamanaco

Este directorio contendrá el servicio monolítico backend basado en NestJS.

Instrucciones rápidas:
1. Crear el proyecto (si aún no existe):
```bash
# desde la raíz del repo
cd backend
npx @nestjs/cli new . --skip-install
```
2. Instalar dependencias y ejecutar en modo desarrollo:
```bash
npm install
npm run start:dev
```

Notas de arquitectura:
- Usar UUID v4 para todas las PK.
- Usar TypeORM/Prisma para migraciones y compatibilidad con PostgreSQL.
- Implementar módulos: Auth, Users, Academico, Evaluacion, Admin.
- Log de sincronización por Bluetooth en `logs_sincronizacion`.

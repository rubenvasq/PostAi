# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
versionado se adoptará cuando exista la primera entrega.

## [Unreleased]

### Añadido

- Documento de contexto operativo `PROJECT_CONTEXT.md`.
- Reglas y convenciones para agentes en `AGENTS.md`.
- Backlog inicial y fuente de verdad del progreso en `TASKS.md`.
- Estructura documental `docs/` con índices por área.
- Plantilla de ADR (`docs/architecture/ADR-000-plantilla.md`).
- ADR-001 de stack móvil en estado propuesto.
- Guía y plantilla para evaluar proveedores SoftPOS en `docs/providers/`.
- `.gitignore` inicial para dependencias, secretos, builds y Android.
- `.editorconfig` con convenciones de formato.
- Modelo de datos del núcleo comercial (`docs/database/data-model.md`) con ERD,
  entidades, estados, invariantes e índices.
- Esquema Prisma ejecutable (`apps/api/prisma/schema.prisma`), generado y
  validado.
- ADR-002 con los supuestos pragmáticos del MVP (COP en pesos enteros, un pago
  por venta, sin facturación electrónica, entre otros).
- Contrato API v1 en `docs/api/README.md` y `docs/api/openapi.yaml`, con
  autenticación, catálogo, ventas, pagos, caja y reportes.
- Validación del esquema Prisma y del contrato OpenAPI.
- ADR-003 con el nombre y la nomenclatura oficial: **Equipo PostAi**, producto
  **PostAi**, repositorio `postai`, paquetes `@postai/*`, base de datos `postai`.
- Nombre oficial aplicado a `PROJECT_CONTEXT.md`, `README.md`, `AGENTS.md`,
  `docs/api/`, `docs/database/` y `docs/development/`.
- Scaffolding del monorepo con npm workspaces (`INF-001`):
  - `apps/api`: Express 5, TypeScript estricto, Zod, Prisma, endpoint `/health`,
    manejo uniforme de errores y pruebas con Vitest + Supertest.
  - `apps/admin`: React 19, Vite 8, Tailwind CSS 4, base de shadcn/ui y estado
    de la API en el panel.
  - Configuración raíz de ESLint, Prettier, typecheck y scripts de workspace.
  - `docker-compose.yml` con PostgreSQL 17 y variables de entorno de ejemplo.
- Prisma Client generado y esquema validado; migración inicial pendiente de
  Docker en ejecución.
- CI con GitHub Actions (`INF-007`): formato, lint, typecheck, pruebas y build
  sobre Node.js 22, con caché de npm y cancelación de ejecuciones obsoletas.
- Publicación inicial en GitHub
  ([`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi)) y ejecución correcta
  del CI sobre `main`.

### Notas

- El backend y el panel web tienen scaffolding ejecutable. La app Android sigue
  pendiente de la decisión de stack (`ARQ-001`) y el proveedor SoftPOS de
  `PAY-001`.
- El repositorio remoto es
  [`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi).

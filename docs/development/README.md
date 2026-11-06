# Desarrollo — PostAi

Guía de entorno, convenciones y flujo de trabajo del repositorio `postai`, del
**Equipo PostAi**.

> **Estado:** scaffolding inicial disponible (`INF-001`). La API y el panel web
> funcionan; la app Android sigue pendiente de `ARQ-001`.

## Identidad del repositorio

| Elemento | Valor |
| --- | --- |
| Equipo | **Equipo PostAi** |
| Repositorio | `postai` (remoto: `rubenvasq/PosAi`) |
| Paquetes | `@postai/api`, `@postai/admin`, `@postai/shared` |
| Base de datos | `postai` |
| Docker Compose | `postai` |

Ver [`ADR-003`](../architecture/ADR-003-nombre-y-nomenclatura.md).

## Requisitos

- Node.js >= 22 (probado con Node 24).
- npm >= 10 (probado con npm 11).
- Docker y Docker Compose para PostgreSQL local.
- Android Studio y SDK de Android solo cuando se cree `apps/mobile`.
- Dispositivo Android físico compatible para pruebas SoftPOS.

## Estructura

```text
postai/
├── apps/
│   ├── api/          # Express 5 + TypeScript + Prisma
│   ├── admin/        # React 19 + Vite 8 + Tailwind 4 + shadcn/ui
│   └── mobile/       # Pendiente de ARQ-001
├── packages/         # Solo cuando exista necesidad concreta
└── docs/
```

No crear paquetes compartidos antes de que sean necesarios.

## Instalación

```bash
npm install
cp apps/api/.env.example apps/api/.env
```

En PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

> `npm install` ejecuta `prisma generate`. Si npm bloquea los scripts de
> instalación, ejecuta
> `npm approve-scripts @prisma/client prisma @prisma/engines esbuild` y luego
> `npm rebuild`.

## Base de datos

```bash
npm run db:up       # PostgreSQL en Docker
npm run db:migrate  # crea y aplica migraciones
npm run db:studio   # Prisma Studio
npm run db:down     # detiene los contenedores
```

La URL por defecto es
`postgresql://postai:postai@127.0.0.1:5432/postai`.
El esquema ejecutable está en `apps/api/prisma/schema.prisma`.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | API y panel en modo desarrollo |
| `npm run dev:api` | API en `http://127.0.0.1:3000` |
| `npm run dev:admin` | Panel en `http://127.0.0.1:5173` |
| `npm run build` | Compila API y panel |
| `npm run typecheck` | TypeScript estricto |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run format:check` | Verifica el formato |
| `npm test` | Pruebas de la API |
| `npm run db:generate` | Genera Prisma Client |
| `npm run db:migrate` | Migraciones de Prisma |
| `npm run db:studio` | Prisma Studio |

## Endpoints base

- `GET /health` — salud de la API.
- `GET /v1/...` — contrato en [`docs/api/openapi.yaml`](../api/openapi.yaml).

El panel web usa un proxy de Vite hacia `http://127.0.0.1:3000` para `/health` y
`/v1`.

## Variables de entorno

`apps/api/.env.example` define:

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | `development`, `test` o `production` |
| `PORT` | Puerto de la API (3000 por defecto) |
| `DATABASE_URL` | Conexión PostgreSQL |
| `CORS_ORIGIN` | Origen permitido del panel web |

Los secretos reales no se versionan; `.env` está ignorado por Git.

## Ramas y commits

- Una rama por tarea: `feat/<id>-descripcion`, `fix/<id>-descripcion`,
  `docs/<id>-descripcion`.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- PR pequeños, con criterios de aceptación y pruebas reportadas.

## Integración continua

El flujo [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) se ejecuta
en cada `push` a `main`, en cada pull request y de forma manual. Usa Node.js 22,
caché de npm y cancela ejecuciones anteriores de la misma referencia.

Pasos del job:

1. `npm ci`
2. `npm run db:generate`
3. `npm run format:check`
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`
7. `npm run build`

No requiere PostgreSQL porque las pruebas actuales no acceden a la base de
datos. Cuando se añadan pruebas de integración se incorporará un servicio de
PostgreSQL al flujo. El CI se ejecuta en el repositorio remoto
[`rubenvasq/PosAi`](https://github.com/rubenvasq/PosAi).

## Flujo

1. Tomar tarea de `TASKS.md`.
2. Definir criterios de aceptación.
3. Implementar.
4. Ejecutar `npm run format:check`, `npm run lint`, `npm run typecheck` y
   `npm test`.
5. Actualizar `TASKS.md` y `CHANGELOG.md`.
6. Revisión del arquitecto antes de fusionar.

## Pendiente de definir

- Estrategia de pruebas E2E.
- Stack móvil (`ARQ-001`).
- Migración inicial aplicada (requiere Docker en ejecución).

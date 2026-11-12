# Desarrollo — PostAi

Guía de entorno, convenciones y flujo de trabajo del repositorio `postai`, del
**Equipo PostAi**.

> **Estado:** scaffolding inicial disponible (`INF-001`), backend del MVP con
> autenticación, comercio, carrito, catálogo, clientes, inventario, ventas,
> pagos simulados, reembolsos, caja y gastos, dashboard y auditoría, y panel
> web administrativo completo (`MVP-012`, `MVP-014`, `MVP-015`). La app Android
> sigue pendiente de `ARQ-001` y del proveedor SoftPOS (`PAY-002`).

## Identidad del repositorio

| Elemento | Valor |
| --- | --- |
| Equipo | **Equipo PostAi** |
| Repositorio | `postai` (remoto: `rubenvasq/PostAi`) |
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
El esquema ejecutable está en `apps/api/prisma/schema.prisma` y la migración
inicial en `apps/api/prisma/migrations/20261107004220_init`.

```bash
npm run db:migrate   # aplica migraciones pendientes o crea una nueva
```

Si `prisma generate` falla en Windows con `EPERM` al renombrar
`query_engine-windows.dll.node`, detén los watchers de `npm run dev` (o cualquier
proceso que use Prisma) y vuelve a ejecutar `npm run db:generate`.

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
- `POST /v1/auth/register` — registro de usuario y comercio.
- `POST /v1/auth/login` — inicio de sesión.
- `POST /v1/auth/refresh` — rotación del refresh token.
- `POST /v1/auth/logout` — revocación del refresh token.
- `GET /v1/auth/me` — usuario y membresías con bearer token.
- `GET/PATCH /v1/merchant` — comercio activo (cabecera `X-Merchant-Id`).
- `GET /v1/branches` — sucursales del comercio activo.
- `GET/POST /v1/categories`, `PATCH/DELETE /v1/categories/{id}` — categorías.
- `GET/POST /v1/tax-rates` — impuestos.
- `GET/POST /v1/products`, `GET/PATCH/DELETE /v1/products/{id}` — productos.
- `GET/POST /v1/customers`, `GET/PATCH /v1/customers/{id}` — clientes.
- `GET /v1/inventory`, `POST /v1/inventory/{productId}/adjustments`,
  `GET /v1/inventory/movements` — inventario y movimientos.
- `GET /v1/...` — contrato completo en
  [`docs/api/openapi.yaml`](../api/openapi.yaml).

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
| `JWT_SECRET` | Clave HS256, mínimo 32 caracteres; obligatoria en producción |
| `JWT_ISSUER` | Emisor del access token (`postai-api`) |
| `JWT_AUDIENCE` | Audiencia del access token (`postai-clients`) |
| `ACCESS_TOKEN_TTL_SECONDS` | Vida del access token en segundos (900) |
| `REFRESH_TOKEN_TTL_DAYS` | Vida del refresh token en días (30) |
| `BCRYPT_ROUNDS` | Coste de bcrypt (12; 4 en pruebas) |

Los secretos reales no se versionan; `.env` está ignorado por Git. En producción
la API se niega a arrancar si `JWT_SECRET` conserva el valor de desarrollo.

El panel web solo usa una variable pública:

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `VITE_API_BASE_URL` | URL base de la API | vacío (proxy de Vite a `127.0.0.1:3000`) |

Detalle en [`apps/admin/README.md`](../../apps/admin/README.md).

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
[`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi).

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
- Pruebas de integración de la API contra PostgreSQL en CI (hoy las pruebas de
  `auth` usan un repositorio en memoria).

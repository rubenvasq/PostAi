# HANDOFF → OpenCode

> Instrucciones del arquitecto (Claude Code) para que OpenCode continúe el
> trabajo en **PostAi** (`postai`). Fecha: 2026-11-07.

## Antes de tocar código

1. Lee en orden: `PROJECT_CONTEXT.md` → `AGENTS.md` → `TASKS.md` → el ADR de la
   tarea.
2. Respeta tu rol de **implementador** (`AGENTS.md`): implementas contra los
   contratos ya definidos; **no** inventas endpoints, métodos de SDK ni
   capacidades de proveedor.
3. Trabaja en una rama por tarea y mantén `TASKS.md` y `CHANGELOG.md` al día.

## Estado actual del repo

- `main` está al día con `origin/main`. Último trabajo fusionado: `MVP-004`
  (carrito y checkout) y `PAY-001` (fichas de proveedores).
- **Hay cambios sin commitear** de la investigación de alternativas de pago
  gratuitas (no los hizo OpenCode, no los toques sin acordar con el usuario):
  - `docs/providers/README.md` (modificado)
  - `docs/providers/alternativas-interinas-gratuitas.md` (nuevo)
- Migraciones `20261107052000_add_device_sessions` y `20261107060000_add_carts`
  ya están aplicadas y verificadas contra PostgreSQL.
- Backend del MVP completo y en verde (102 pruebas, OpenAPI validado).

## Tu próxima tarea: MVP-012 — Panel web administrativo básico

Es la **única tarea implementable** ahora mismo. Las tareas `PAY-002`–`PAY-005`
son investigación/gestión con proveedores (no son de implementación) y
`PAY-010`–`PAY-017` siguen **bloqueadas** hasta confirmar SDK, sandbox y
condiciones para Colombia. **No** arranques integración de pagos reales.

El panel vive en `apps/admin` (React + Vite + Tailwind + base shadcn/ui, ya
andamiado en `INF-003`). Consume la **PostAi API /v1** ya existente; no agregues
ni cambies endpoints del backend para esto.

### Criterios de aceptación propuestos (ajústalos y confírmalos antes de implementar)

- [ ] Login contra `POST /v1/auth/login`; guarda access/refresh token y renueva
      con `POST /v1/auth/refresh`; logout con `POST /v1/auth/logout`.
- [ ] Envía `X-Merchant-Id` en todas las llamadas con contexto de comercio y
      maneja el `401`/refresh de forma transparente.
- [ ] Dashboard con `GET /v1/dashboard/summary` y `GET /v1/reports/sales`.
- [ ] Listados de solo lectura o CRUD mínimo sobre catálogo (`/v1/products`,
      categorías, impuestos), clientes (`/v1/customers`) e inventario
      (`/v1/inventory`), reutilizando paginación y `search` del contrato.
- [ ] Historial de ventas (`GET /v1/sales`, detalle y comprobante).
- [ ] Distinguir en UI datos **simulados** de reales (regla de dominio).
- [ ] Manejo de errores con el formato del contrato; entradas validadas.
- [ ] `npm run lint`, `npm run typecheck` y build del panel en verde.

### Reglas que no puedes romper

- **Android only** en el producto móvil; el panel es web y de gestión, no cobra.
- **Backend = fuente de verdad**; el panel nunca marca pagos como aprobados.
- No almacenar PAN, CVV, PIN ni credenciales sensibles.
- TypeScript estricto; nombres de API/datos en inglés, UI/documentación en
  español.
- Secretos fuera del repo; usa `.env`/`.env.example`.

## Flujo de entrega (de `AGENTS.md`)

1. Marca `MVP-012` como `En curso` en `TASKS.md`.
2. Escribe criterios de aceptación verificables (arriba, afinados).
3. Implementa el cambio mínimo que los cumple.
4. Ejecuta `npm run lint`, `npm run typecheck` y el build; reporta el resultado
   exacto.
5. Actualiza `TASKS.md` y `CHANGELOG.md`.
6. Si aparece una decisión crítica (p. ej. estrategia de estado/auth del panel),
   crea un ADR en `docs/architecture/`.
7. Deja el cambio listo para revisión del arquitecto antes de fusionar.

## Comandos útiles

- `npm run dev:admin` → panel en `http://127.0.0.1:5173`
- `npm run dev:api` → API en `http://127.0.0.1:3000`
- `npm run db:up` / `npm run db:migrate` → PostgreSQL local y migraciones
- `npm run lint` · `npm run typecheck` · `npm run build`

## Dudas antes de empezar

Si algo del contrato API no está claro o hace falta una decisión de arquitectura,
**pregunta al arquitecto (Claude Code)**; no improvises endpoints ni formas de
respuesta nuevas.

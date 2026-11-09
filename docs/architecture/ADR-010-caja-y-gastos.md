# ADR-010 — Caja y gastos del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-11-08
- **Equipo:** Equipo PostAi
- **Contexto relacionado:** `ADR-002`, `ADR-006`, `ADR-007`, `MVP-014`,
  `docs/api/openapi.yaml`, `docs/database/data-model.md`.

## Contexto

El núcleo comercial ya registra ventas y pagos simulados, pero el efectivo no se
controlaba en el sistema: no había apertura/cierre de caja, movimientos manuales
ni gastos. El contrato v1 ya definía `/v1/cash/sessions*` y `/v1/expenses`, y el
esquema Prisma ya tenía `CashSession`, `CashMovement` y `Expense`, pero faltaba
la implementación, la integración con pagos/reembolsos en efectivo, el resumen
en el dashboard y la pantalla del panel.

Restricciones del proyecto: el backend es la fuente de verdad, no se inventan
capacidades del proveedor, no se almacenan datos de tarjeta y toda operación
crítica de pago debe ser idempotente. La caja del MVP no reemplaza la
conciliación bancaria ni la liquidación del proveedor SoftPOS.

## Alternativas consideradas

1. **Caja por terminal o por usuario.** Refleja mejor varios equipos cobrando a
   la vez, pero el MVP no tiene roles (`ADR-006`) ni un modelo de terminales
   maduro; añade complejidad sin datos operativos que la justifiquen.
2. **Caja por sucursal con una sola sesión abierta.** Una sesión `OPEN` por
   sucursal, resuelta como la sucursal `MAIN` (o la primera activa), es simple,
   verificable y coherente con inventario (`ADR-005`). Se elige esta opción.
3. **No registrar movimientos automáticos de ventas/reembolsos.** Menos acople
   entre módulos, pero el cierre no reflejaría el efectivo real. Se descarta.

## Decisión

### 1. Resolución de sucursal y sesión

- Los endpoints de caja no reciben `branchId`: el backend resuelve la sucursal
  `MAIN` del comercio y, si no existe, la primera sucursal activa por código.
- Solo puede existir **una sesión `OPEN` por sucursal**. Se aplica con el índice
  único parcial `cash_sessions_branch_open_key` (`branchId WHERE status =
  'OPEN'`), además de la comprobación en el servicio. Esto evita que dos
  aperturas concurrentes dejen dos cajas abiertas.
- La apertura crea un movimiento `OPENING` de tipo `IN` cuando el monto inicial
  es mayor que cero. Cerrar una sesión ya cerrada responde `409`.

### 2. Cálculo del efectivo esperado

- `expectedAmount = suma de movimientos IN − suma de movimientos OUT` de la
  sesión, incluyendo apertura, ventas, reembolsos, gastos y movimientos
  manuales.
- `difference = closingAmount − expectedAmount`. La diferencia puede ser
  negativa y se conserva para auditoría; el cierre añade las notas del cierre a
  las de apertura.
- Los movimientos son inmutables: no se editan ni se eliminan. Un movimiento
  manual (`DEPOSIT`, `WITHDRAWAL`, `ADJUSTMENT`) solo se acepta en una sesión
  `OPEN`; el importe siempre es positivo y `direction` indica entrada o salida.

### 3. Integración automática con pagos y reembolsos

- Al aprobar un pago con método `CASH`, si la sucursal de la venta tiene una
  sesión abierta, se crea dentro de la **misma transacción Serializable** un
  movimiento `SALE`/`IN` con `referenceType = PAYMENT` y `referenceId` del pago.
- Al aprobar un reembolso de un pago `CASH`, se crea un movimiento
  `REFUND`/`OUT` con `referenceType = REFUND` y `referenceId` del reembolso.
- Si no hay caja abierta, el pago o reembolso **no falla**: se registra sin
  movimiento de caja. El efectivo de operaciones fuera de turno no se
  reconstruye retroactivamente en el MVP.
- La caja no aprueba pagos ni reembolsos; solo refleja el efectivo de
  operaciones ya confirmadas por el backend.

### 4. Gastos

- `POST /v1/expenses` acepta `category`, `amount`, `description`, `incurredAt` y
  `sessionId` opcional. La moneda se toma del comercio (COP por defecto).
- Si se asocia a una sesión `OPEN`, el gasto crea un movimiento `EXPENSE`/`OUT`
  con `referenceType = EXPENSE` y `referenceId` del gasto. Si la sesión no está
  abierta, el gasto se guarda sin afectar el efectivo.
- El listado de gastos filtra por rango de `incurredAt` y pagina por comercio y
  sucursal.

### 5. Dashboard y panel

- `GET /v1/dashboard/summary` devuelve `openCashSession` con `id`, `openedAt` y
  `openingAmount` de la sesión abierta de la sucursal, o `null` si no hay caja.
- El panel (`#/cash`) permite abrir caja, registrar movimientos y gastos, cerrar
  la caja con diferencia calculada y consultar el historial y los gastos. El
  panel nunca calcula importes definitivos ni marca pagos como aprobados.

## Consecuencias

### Positivas

- El cierre de caja refleja ventas y reembolsos en efectivo sin intervención
  manual y sin romper la idempotencia de pagos.
- El índice parcial elimina la carrera de aperturas concurrentes.
- La caja reutiliza el contrato v1 existente; no se agregan endpoints ni se
  cambian los ya publicados.
- El panel cubre el ciclo operativo completo del efectivo del MVP.

### Negativas o riesgos

- Una sola caja por sucursal no distingue varios terminales o cajeros; si el
  negocio lo necesita, se evaluará caja por terminal en un ADR posterior.
- Las ventas/reembolsos en efectivo hechos sin caja abierta no generan
  movimiento; el esperado del siguiente turno no los incluye.
- El redondeo y la moneda siguen el supuesto de pesos enteros de `ADR-002`.
- El índice parcial se aplica al desplegar la migración; si existieran dos
  sesiones `OPEN` por sucursal, la migración fallaría y habría que cerrarlas
  antes.

### Acciones derivadas

- [x] Implementar el módulo `cash` (sesiones, movimientos, gastos) y cablearlo
      en `app.ts`.
- [x] Integrar movimientos `SALE`/`REFUND` en pagos y reembolsos en efectivo.
- [x] Exponer `openCashSession` en `GET /v1/dashboard/summary`.
- [x] Crear la página «Caja y gastos» en `apps/admin`.
- [x] Añadir pruebas del módulo de caja y actualizar `TASKS.md`/`CHANGELOG.md`.
- [ ] Verificar el flujo completo contra PostgreSQL 17 (apertura, venta en
      efectivo, reembolso, gasto y cierre).
- [ ] Evaluar caja por terminal si el negocio lo requiere.

## Referencias

- `docs/api/openapi.yaml` (Caja y gastos).
- `docs/database/data-model.md` (reglas de caja y gastos).
- `ADR-002` (supuestos del MVP), `ADR-006` (sin roles), `ADR-007` (ventas y
  pagos simulados).
- `apps/api/src/modules/cash/`, `apps/api/prisma/migrations/20261108000000_add_cash_open_unique_index/migration.sql`.

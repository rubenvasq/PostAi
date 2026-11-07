# Base de datos — PostAi

Proyecto: **PostAi** (`postai`), del **Equipo PostAi**. Base de datos PostgreSQL:
`postai`.

Modelo de datos del núcleo comercial del MVP.

> **Estado:** modelo aprobado con los supuestos de `ADR-002`. El esquema Prisma
> ejecutable vive en el backend y ya fue validado y generado. La migración
> inicial queda pendiente de aplicar con Docker en ejecución.

## Documentos

| Documento | Contenido |
| --- | --- |
| [`data-model.md`](data-model.md) | ERD, entidades, estados, invariantes e índices |
| [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) | Esquema Prisma ejecutable |

## Resumen

- **Multi-tenant** por `Merchant`; `Branch` obligatoria con sucursal `MAIN`.
- **Usuarios** globales con `Membership` por comercio. Sin roles en el MVP:
  el terminal usa una cuenta por comercio y varios teléfonos pueden compartirla.
- **Catálogo** con productos/servicios, categorías, variantes e impuestos.
- **Inventario** por producto y sucursal, con movimientos inmutables.
- **Ventas** con snapshot de precios y datos del producto.
- **Pagos** separados de ventas, con intentos, webhooks, reembolsos y
  liquidaciones.
- **Caja** con sesiones, movimientos y gastos.
- **Auditoría** de acciones relevantes.

## Distinciones obligatorias

No son equivalentes y se modelan por separado:

1. **Venta registrada** — `Sale`.
2. **Pago aprobado** — `Payment` con estado `APPROVED`.
3. **Pago liquidado** — `Settlement` / `SettlementItem`.
4. **Reembolso** — `Refund`.

## Reglas clave

- Dinero como `BigInt`; en el MVP COP se almacena en **pesos enteros**
  (exponente 0) y la API lo expone como string. Ver `ADR-002`.
- Sin PAN, CVV, PIN ni credenciales sensibles.
- Idempotencia única por comercio en ventas, pagos y reembolsos.
- Pagos simulados marcados y excluidos de conciliación real.
- No se eliminan registros financieros.

## Próximo paso

La migración inicial `20261107004220_init` ya está aplicada. Comenzar los módulos
del MVP sobre el esquema vigente (`MVP-002` en adelante).

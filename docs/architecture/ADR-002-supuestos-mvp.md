# ADR-002 — Supuestos pragmáticos del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-11-06
- **Decisores:** producto + implementación
- **Contexto relacionado:** `ARQ-002`, `ARQ-003`, `docs/database/data-model.md`

## Contexto

El modelo de datos dejó varias preguntas abiertas. Para avanzar sin bloquear el
MVP se adoptan supuestos razonables y de baja complejidad. La prioridad es un
flujo de venta y cobro confiable, no cubrir todos los casos desde el inicio.

## Decisión

| Tema | Decisión para el MVP | Motivo |
| --- | --- | --- |
| Moneda | COP en **pesos enteros** (exponente 0). `$10.000` se almacena como `10000`. | Evita centavos inexistentes en la operación diaria y simplifica UI/API. |
| Impuestos | Un `TaxRate` por producto, **agregado al precio**; por defecto 0 %. | Cálculo simple; sin impuestos compuestos. |
| Facturación electrónica / DIAN | Fuera de alcance. Comprobante interno **no fiscal**. | Requiere validación legal/contable específica. |
| Sucursales | Una sucursal `MAIN`; multi-sucursal solo modelada. | Menor complejidad operativa. |
| Pagos por venta | **Uno** por venta en el MVP; el modelo soporta varios. | Evita conciliación y UI de pagos divididos. |
| Reembolsos | **Totales**, solo si el método lo permite. Parciales modelados pero no expuestos. | Reduce estados y casos límite. |
| Stock negativo | **Bloqueado**. | Evita inventario inconsistente. |
| Vuelto en efectivo | No se almacena; la UI calcula el vuelto. El pago registra el total. | No afecta la venta ni la caja. |
| Descuentos | Solo **a nivel de venta**; sin cupones ni descuentos por ítem en la UI. | Un solo campo y un solo cálculo. |
| Variantes | Modeladas, **no expuestas** en el MVP. | Se pospone complejidad de catálogo. |
| Liquidaciones | Modeladas, **sin UI** en el MVP. | Conciliación se valida con el proveedor real. |
| Retención | Conservar registros financieros; definir política antes de producción. | No borrar historia del MVP. |
| Roles | Sembrar `OWNER`, `ADMIN`, `CASHIER`, `SELLER`, `ACCOUNTANT`; asignar rol, sin editor de permisos. | Permisos básicos sin UI compleja. |
| Autenticación | Email + contraseña; access token 15 min; refresh token 30 días con rotación. | Estándar simple y seguro. |
| Paginación | `page` / `pageSize`, máximo 100. | Sencilla de implementar y consumir. |
| Pagos simulados | El backend aprueba `CARD_SIMULATED` y lo marca como simulado. | Permite probar el flujo sin SDK. |
| SoftPOS real | `CARD_SOFTPOS` responde `501` hasta `ARQ-004`. | No inventar integración ni SDK. |
| Reportes | Rango de fechas; zona horaria `America/Bogota`. | Cubre el dashboard básico. |

## Consecuencias

### Positivas

- El MVP se puede implementar sin proveedor SoftPOS ni decisiones fiscales.
- El contrato API y el modelo quedan cerrados para el flujo comercial.
- Los pagos simulados permiten validar ventas, caja y comprobantes.

### Riesgos y límites

- COP con exponente 0 se desvía de ISO 4217. Si contabilidad exige centavos,
  habrá que migrar importes.
- Sin facturación electrónica no se cubre una obligación fiscal que pueda
  aplicar en Colombia.
- Un solo pago por venta limita propinas o pagos mixtos.
- Reembolsos parciales y liquidaciones quedan para una fase posterior.
- La aprobación automática de pagos simulados debe quedar claramente marcada
  en UI, recibos y reportes.

## Acciones derivadas

- [x] Actualizar `docs/database/data-model.md` con estos supuestos.
- [x] Definir el contrato API v1 en `docs/api/`.
- [ ] Validar requisitos fiscales (DIAN) antes de producción.
- [ ] Confirmar reembolsos y conciliación con el proveedor real.
- [ ] Definir política de retención y privacidad.

## Referencias

- `docs/database/data-model.md`
- `docs/api/README.md`
- `docs/providers/README.md`

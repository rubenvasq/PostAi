# ADR-006 — Modelo de terminal sin roles de empleado

- **Estado:** Aceptado
- **Fecha:** 2026-11-06
- **Decisores:** producto + arquitectura + implementación
- **Contexto relacionado:** `MVP-001`, `MVP-002`, `MVP-003`, `MVP-008`,
  `MVP-009`, `MVP-010`, `ADR-002`, `ADR-004`,
  [`docs/database/data-model.md`](../database/data-model.md),
  [`docs/api/openapi.yaml`](../api/openapi.yaml)

## Contexto

El modelo inicial asumía un POS genérico con **empleados**, **roles** y
**permisos**: `Role`, `Permission`, `RolePermission`, `Membership.roleId`, los
endpoints `GET/POST /v1/users`, `PATCH /v1/users/{userId}` y `GET /v1/roles`, y
chequeos de escritura por rol (`OWNER`, `ADMIN`, `CASHIER`, `SELLER`,
`ACCOUNTANT`) en comercio, catálogo, clientes e inventario.

El producto real es un **teléfono-terminal**: el dispositivo es el punto de
venta y el dueño opera con su cuenta. No hay empleados que administrar desde el
MVP y, por tanto, los roles no aportan valor. El control de acceso lo da el
desbloqueo del teléfono y la sesión autenticada.

Además, el usuario confirmó que **varios teléfonos pueden usar la misma cuenta**
del comercio. Eso no requiere roles, pero sí exige que la sesión sea por
dispositivo, algo que el refresh token ya modela de forma independiente.

## Decisión

### Eliminar roles y permisos del MVP

- Se eliminan los modelos `Role`, `Permission` y `RolePermission`, y el campo
  `Membership.roleId`.
- Se eliminan del contrato v1 los endpoints de empleados y roles:
  `GET/POST /v1/users`, `PATCH /v1/users/{userId}` y `GET /v1/roles`, junto con
  los esquemas `RoleSummary`, `Member`, `Permission`, `Role`,
  `UserCreateRequest` y `UserUpdateRequest`.
- La respuesta de autenticación deja de incluir `membership.role` y
  `memberships[].role`.
- El reporte de ventas deja de agrupar por `employee`; quedan `day` y
  `payment_method`.

### Autorización por membresía activa

- La única regla de autorización es tener una **membresía `ACTIVE`** con el
  comercio indicado en `X-Merchant-Id`.
- Cualquier miembro activo puede leer y escribir los recursos del comercio en
  este MVP.
- La autoría se conserva con campos como `createdByUserId` y, cuando se
  implemente, `AuditLog` (`MVP-013`). No se pierde trazabilidad por quitar
  roles.

### Varios teléfonos con la misma cuenta

- Varios dispositivos pueden iniciar sesión con la misma cuenta de comercio.
  Cada `POST /v1/auth/login` crea su propio refresh token y su propia rotación,
  de modo que cerrar sesión en un teléfono no afecta a los demás.
- La **identificación formal de dispositivos** (`Device`/`Terminal`: nombre,
  plataforma, estado, último acceso, revocación por dispositivo) se difiere a
  `MVP-010`. No es requisito para habilitar el login concurrente.

## Consecuencias

### Positivas

- Esquema, contrato, servicios y pruebas más simples y alineados con el producto
  real.
- El registro crea solo usuario, comercio, sucursal `MAIN` y membresía, en una
  transacción.
- Desaparecen los errores `403` por rol y los catálogos de permisos que no se
  usaban desde la app.
- El login concurrente en varios teléfonos funciona sin cambios adicionales.

### Negativas o riesgos

- Cualquier miembro activo del comercio puede modificar configuración,
  catálogo, clientes e inventario. En el MVP el comercio tiene una sola cuenta
  operativa, así que el riesgo es equivalente al acceso al teléfono.
- Sin identificación de dispositivo no se puede revocar una sesión por terminal
  ni auditar desde qué teléfono se hizo una operación. Se retoma en `MVP-010`.
- Si más adelante se requieren empleados con permisos distintos, habrá que
  introducir roles de forma explícita y migrar las membresías existentes.

## Acciones derivadas

- [x] Quitar `Role`, `Permission`, `RolePermission` y `Membership.roleId` del
  esquema Prisma.
- [x] Simplificar los módulos `auth`, `merchant`, `catalog`, `customer` e
  `inventory`.
- [x] Retirar endpoints y esquemas de usuarios/roles del contrato v1.
- [x] Adaptar las pruebas a autorización por membresía activa.
- [x] Regenerar la migración inicial sin tablas de roles.
- [ ] Implementar identificación y administración de terminales (`MVP-010`).
- [ ] Añadir `AuditLog` con autoría por usuario (`MVP-013`).

## Referencias

- [`docs/database/data-model.md`](../database/data-model.md)
- [`docs/api/README.md`](../api/README.md)
- [`docs/api/openapi.yaml`](../api/openapi.yaml)
- [`ADR-002`](ADR-002-supuestos-mvp.md) — supuesto de roles sustituido.
- [`ADR-004`](ADR-004-autenticacion-y-sesiones.md) — registro con roles
  sustituido.

# PROJECT_CONTEXT — PostAi

> Nombre confirmado por el usuario: **Equipo PostAi**. Producto: **PostAi**
> (`postai`).
>
> Resumen operativo del proyecto. El detalle completo está en el documento de
> contexto. Este archivo debe mantenerse breve y actualizado.

## Identidad del proyecto

| Elemento | Valor oficial |
| --- | --- |
| Equipo / titular | **Equipo PostAi** |
| Producto | **PostAi** |
| Descripción corta | Plataforma POS + SoftPOS para Android |
| Repositorio / slug | `postai` (GitHub: [`rubenvasq/PosAi`](https://github.com/rubenvasq/PosAi)) |
| Carpeta local | `NFC` (solo ruta de trabajo, no es el nombre del producto) |
| Paquetes | `@postai/api`, `@postai/admin`, `@postai/shared` |
| API | PostAi API (`/v1`) |
| Base de datos | `postai` |
| Docker Compose | `postai` |
| App Android | **PostAi** (`applicationId` propuesto: `com.postai.app`) |

La decisión completa está en
[`docs/architecture/ADR-003-nombre-y-nomenclatura.md`](docs/architecture/ADR-003-nombre-y-nomenclatura.md).

## Estado actual

- **Fase:** scaffolding inicial y diseño de arquitectura.
- **Código:** monorepo con API y panel web; app Android pendiente de `ARQ-001`.
- **Plataforma del MVP:** Android únicamente. iOS queda fuera del alcance.
- **Proveedor SoftPOS:** no seleccionado ni validado para Colombia.

## Objetivo

Construir una plataforma de punto de venta (POS) para comercios que permita
convertir un teléfono Android compatible en un terminal de aceptación de pagos
sin contacto mediante **SoftPOS**, junto con backend/API y panel web
administrativo.

No es solo una app para cobrar con NFC: es una herramienta integral para
administrar ventas, productos, clientes, inventario y caja.

## Alcance del MVP

1. Registro e inicio de sesión.
2. Configuración básica del comercio.
3. Productos, servicios y categorías.
4. Carrito y checkout.
5. Registro de ventas.
6. Pagos en efectivo y transferencia (registro, sin procesar el dinero).
7. Integración SoftPOS Android, cuando exista proveedor validado y SDK.
8. Historial de ventas y pagos.
9. Comprobantes.
10. Clientes básicos.
11. Inventario básico.
12. Empleados y permisos básicos.
13. Dashboard con indicadores esenciales.
14. Panel web administrativo básico.
15. Auditoría de operaciones relevantes.

## Fuera de alcance actual

- Aplicación iOS, Swift y publicación en App Store.
- Fidelización avanzada, IA generativa y analítica avanzada.
- Multi-sucursal compleja, compras/proveedores e integraciones contables.
- Procesar pagos con el NFC genérico del teléfono.

## Stack propuesto

| Capa | Tecnología |
| --- | --- |
| Monorepo | npm workspaces (`apps/*`, `packages/*`) |
| Backend | Node.js + Express 5 + TypeScript + PostgreSQL + Prisma + Zod |
| Auth | JWT + refresh tokens |
| Panel web | React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Recharts |
| Móvil | **Pendiente**: React Native + Expo + módulo Kotlin, o Kotlin + Jetpack Compose |
| Infra | Docker Compose, GitHub Actions, S3 compatible, Sentry, FCM |
| Pruebas | Vitest/Jest, Supertest, Maestro (si es compatible) |

Las versiones concretas se definirán al crear el repositorio y se fijarán con
los archivos de bloqueo correspondientes.

## Decisiones pendientes

| Tema | Estado | Documento |
| --- | --- | --- |
| Stack móvil | Pendiente | `docs/architecture/ADR-001-stack-movil.md` |
| Proveedor SoftPOS con soporte en Colombia | Pendiente | `docs/providers/README.md` |
| Acceso a SDK y sandbox | Pendiente | `docs/providers/README.md` |
| Dispositivos compatibles y certificaciones | Pendiente | `docs/providers/README.md` |
| Supuestos del MVP | Aceptado | `docs/architecture/ADR-002-supuestos-mvp.md` |
| Modelo de datos | Aprobado con supuestos | `docs/database/data-model.md` |
| Contratos API v1 | Borrador en revisión | `docs/api/README.md` |
| Contrato `PaymentProvider` | Pendiente (SDK real) | `docs/api/README.md` |
| Modelo comercial (comisiones, liquidaciones) | Pendiente | — |

## Reglas no negociables

1. La aceptación real de tarjetas usa un **proveedor SoftPOS autorizado y su
   SDK certificado**. No se implementa con NFC genérico.
2. El **backend es la fuente de verdad** de la transacción.
3. El móvil **nunca** marca un pago como aprobado por sí solo.
4. El resultado se verifica con el proveedor mediante su mecanismo documentado.
5. Operaciones críticas con **idempotencia** para evitar cobros duplicados.
6. Webhooks autenticados y trazabilidad de intentos.
7. **No** almacenar PAN, CVV, PIN ni credenciales sensibles.
8. **No** asumir que todo Android con NFC es compatible.
9. Sandbox y producción siempre separados.
10. **No inventar** APIs, SDK, métodos, parámetros ni endpoints.
11. Si una decisión crítica no está definida, documentar la duda y solicitar
    aprobación antes de asumir.
12. Distinguir explícitamente **pagos simulados** de **pagos reales** en la UI
    y en los datos.

## Riesgo principal

El mayor riesgo no es construir el POS, sino conseguir y validar una
integración SoftPOS que permita operar legal y técnicamente en Colombia. Es una
dependencia crítica que debe validarse al inicio.

## Documentos del proyecto

- [`AGENTS.md`](AGENTS.md): reglas y convenciones para agentes.
- [`TASKS.md`](TASKS.md): fuente de verdad del progreso.
- [`CHANGELOG.md`](CHANGELOG.md): cambios relevantes.
- [`docs/architecture/`](docs/architecture/README.md): decisiones (ADR).
- [`docs/providers/`](docs/providers/README.md): investigación de proveedores.
- [`docs/api/`](docs/api/README.md): contratos de API.
- [`docs/database/`](docs/database/README.md): modelo de datos.
- [`docs/security/`](docs/security/README.md): seguridad y cumplimiento.
- [`docs/development/`](docs/development/README.md): entorno y convenciones.

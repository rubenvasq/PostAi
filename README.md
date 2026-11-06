# PostAi

[![CI](https://github.com/rubenvasq/PosAi/actions/workflows/ci.yml/badge.svg)](https://github.com/rubenvasq/PosAi/actions/workflows/ci.yml)

**Plataforma POS + SoftPOS para Android.**

Equipo: **Equipo PostAi**. Repositorio: `postai`
([`rubenvasq/PosAi`](https://github.com/rubenvasq/PosAi)). Nombre confirmado por
el usuario y formalizado en
[`ADR-003`](docs/architecture/ADR-003-nombre-y-nomenclatura.md).

Plataforma de punto de venta para comercios que permite convertir un teléfono
Android compatible en un terminal de aceptación de pagos sin contacto mediante
**SoftPOS**, con backend/API y panel web administrativo.

> **Estado:** scaffolding inicial. API y panel web ejecutables; app Android
> pendiente de `ARQ-001`. El MVP es **Android únicamente**.

## Inicio rápido

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

- API: `http://127.0.0.1:3000/health`
- Panel: `http://127.0.0.1:5173`

Con Docker disponible: `npm run db:up` para PostgreSQL local. Más detalle en
[`docs/development/README.md`](docs/development/README.md).

## Documentación

| Documento | Contenido |
| --- | --- |
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | Resumen operativo: alcance, stack y reglas |
| [`AGENTS.md`](AGENTS.md) | Instrucciones y convenciones para agentes |
| [`TASKS.md`](TASKS.md) | Backlog y estado del progreso |
| [`CHANGELOG.md`](CHANGELOG.md) | Cambios relevantes |
| [`contexto_proyecto_softpos_android.md`](contexto_proyecto_softpos_android.md) | Documento de contexto completo |
| [`docs/architecture/`](docs/architecture/README.md) | Decisiones técnicas (ADR) |
| [`docs/providers/`](docs/providers/README.md) | Investigación de proveedores SoftPOS |
| [`docs/api/`](docs/api/README.md) | Contratos de API |
| [`docs/database/`](docs/database/README.md) | Modelo de datos |
| [`docs/security/`](docs/security/README.md) | Seguridad y cumplimiento |
| [`docs/development/`](docs/development/README.md) | Entorno y convenciones |

## Principios clave

- La aceptación real de tarjetas requiere un **proveedor SoftPOS autorizado y su
  SDK certificado**; no se usa el NFC genérico.
- El **backend es la fuente de verdad** de la transacción.
- **No** se almacenan PAN, CVV, PIN ni credenciales sensibles.
- Los pagos **simulados** se distinguen siempre de los **reales**.
- No se inventan APIs, SDK ni endpoints.

## Próximos pasos

1. Publicar el repositorio en GitHub para activar el CI (`INF-007`).
2. Implementar autenticación y registro (`MVP-001`).
3. Investigar proveedores SoftPOS con operación en Colombia (`PAY-001`).
4. Solicitar documentación, SDK y sandbox (`PAY-002`).
5. Decidir el stack móvil (`ARQ-001`).

Consulta [`TASKS.md`](TASKS.md) para el detalle.

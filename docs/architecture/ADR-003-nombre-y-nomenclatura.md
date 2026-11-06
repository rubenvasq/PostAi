# ADR-003 — Nombre y nomenclatura oficial

- **Estado:** Aceptado
- **Fecha:** 2026-11-06
- **Decisores:** producto + implementación
- **Contexto relacionado:** `DOC-002`, nombre confirmado por el usuario
  (**Equipo PostAi**), `PROJECT_CONTEXT.md`, `docs/api/openapi.yaml`

## Contexto

El usuario confirmó que el nombre de referencia es **Equipo PostAi**. El
documento de contexto proponía `softpos-platform/`, pero ese valor queda
reemplazado por el nombre aportado por el usuario.

La carpeta local de trabajo se llama `NFC`, pero ese nombre corresponde a la
tecnología, no al producto. El producto se identifica como **PostAi** y el
equipo como **Equipo PostAi**.

## Decisión

Se adopta una identidad única y se aplica en toda la documentación:

| Elemento | Valor oficial |
| --- | --- |
| Equipo / titular | **Equipo PostAi** |
| Producto | **PostAi** |
| Nombre de referencia | `Equipo PostAi` |
| Descripción corta (ES) | Plataforma POS + SoftPOS para Android |
| Repositorio / slug | `postai` (remoto GitHub: `rubenvasq/PostAi`) |
| Carpeta local actual | `NFC` (solo ruta de trabajo; no es el nombre del producto) |
| Paquete raíz npm | `postai` (privado) |
| Scope de paquetes | `@postai/` (`@postai/api`, `@postai/admin`, `@postai/shared`) |
| API | **PostAi API** |
| Prefijo de versión de API | `/v1` |
| Base de datos PostgreSQL | `postai` |
| Proyecto Docker Compose | `postai` |
| App Android (nombre visible) | **PostAi** |
| `applicationId` Android (propuesto) | `com.postai.app` |

### Reglas de uso

1. En la primera mención de un documento se escribe **PostAi**.
2. El equipo se acredita como **Equipo PostAi** en contactos, créditos y datos
   legales.
3. El título descriptivo se usa como subtítulo, nunca como nombre del producto.
4. El slug `postai` se usa en repositorio, paquetes, Docker, base de datos y
   nombres técnicos.
5. `NFC` no se usa como nombre del producto ni del repositorio.
6. No se crean variantes como `Post AI`, `PostAI`, `post-ai` o `PostAi POS`.
7. El `applicationId` Android es una propuesta; debe confirmarse antes de
   publicar en Play Store (`PAY-003`, `ARQ-001`).

## Consecuencias

### Positivas

- Un solo nombre para documentación, API, repositorio e infraestructura.
- El scaffolding de `INF-001` puede crear paquetes y contenedores sin renombrar.
- Se elimina la ambigüedad entre `NFC`, el título descriptivo y el slug.

### Riesgos y límites

- La carpeta local `NFC` seguirá apareciendo en rutas absolutas; no se renombra
  para no romper el entorno de trabajo.
- El `applicationId` y el dominio de producción son propuestas y requieren
  confirmación antes de publicar.
- Si el usuario confirma otro nombre comercial, este ADR se sustituye por uno
  nuevo y se actualizan todos los documentos.

## Acciones derivadas

- [x] Registrar la identidad en `PROJECT_CONTEXT.md`.
- [x] Alinear `README.md`, `AGENTS.md`, `TASKS.md` y `CHANGELOG.md`.
- [x] Alinear `docs/api/` y `docs/database/`.
- [ ] Confirmar nombre comercial definitivo y `applicationId` antes de publicar.
- [x] Usar estos valores en el scaffolding de `INF-001`.
- [x] Publicar el repositorio en GitHub como `rubenvasq/PostAi`.

## Historial

- **2026-11-06:** se registró inicialmente `softpos-platform` como marcador
  tomado del documento de contexto. El usuario confirmó **Equipo PostAi**; se
  reemplaza por **PostAi** (`postai`).
- **2026-11-06:** el repositorio remoto se publicó inicialmente como `PosAi` y
  se renombró a `PostAi` para alinear el nombre con la identidad oficial.

## Referencias

- `PROJECT_CONTEXT.md`.
- `docs/api/openapi.yaml`.
- `contexto_proyecto_softpos_android.md` §10 (estructura propuesta, nombre
  sustituido por la confirmación del usuario).

# ADR-004 — Autenticación y sesiones del backend

- **Estado:** Aceptado
- **Fecha:** 2026-11-06
- **Decisores:** arquitectura + implementación
- **Parcialmente sustituido por:** `ADR-006` (registro sin roles)
- **Contexto relacionado:** `MVP-001`, `ARQ-003`, `ADR-002`, `ADR-006`,
  [`docs/api/README.md`](../api/README.md),
  [`docs/api/openapi.yaml`](../api/openapi.yaml),
  [`docs/database/data-model.md`](../database/data-model.md)

## Contexto

El MVP necesita que la app Android y el panel web obtengan una identidad
verificada antes de operar ventas, pagos y caja. El contrato API v1 ya define los
endpoints de autenticación, pero no fijaba el mecanismo concreto de sesión ni las
reglas de registro. Había que decidir ahora para implementar `MVP-001` sin
inventar comportamiento que luego obligue a rehacer el cliente.

Restricciones vigentes:

- El backend es la fuente de verdad; el móvil nunca aprueba pagos.
- No se almacenan credenciales sensibles ni datos de tarjeta.
- El registro debe dejar un comercio operativo desde el primer inicio de sesión.
- La solución debe ser simple de operar y compatible con Android y web.

## Alternativas consideradas

1. **Sesión opaca en base de datos (solo cookie o token de sesión).**
   Ventajas: revocación inmediata y sencilla. Riesgos: cada petición consulta la
   base de datos y el cliente móvil necesita manejar cookies o un token opaco de
   corta vida igualmente.
2. **JWT de acceso de larga vida sin refresh token.**
   Ventajas: menos piezas. Riesgos: no se puede revocar ni rotar; una filtración
   queda válida durante días.
3. **JWT de acceso corto + refresh token opaco con rotación (elegida).**
   Ventajas: acceso sin consultar la base de datos, ventana de exposición corta y
   revocación efectiva del refresh token. Riesgos: hay que gestionar rotación y
   almacenar solo el hash.

## Decisión

### Access token

- JWT firmado con **HS256** usando `JWT_SECRET` (mínimo 32 caracteres).
- Vida de **15 minutos** por defecto (`ACCESS_TOKEN_TTL_SECONDS=900`).
- Claims: `sub` = `User.id`, `iss`, `aud`, `iat`, `exp` y `tokenType: "access"`.
- Se envía como `Authorization: Bearer <accessToken>`.
- El backend valida firma, emisor, audiencia y `tokenType`; además comprueba que
  el usuario exista y esté `ACTIVE`.

### Refresh token

- Token **opaco aleatorio** de 32 bytes en `base64url`, generado en el servidor.
- En la base de datos se guarda solo `SHA-256(token)` en
  `RefreshToken.tokenHash` (único); nunca el token en claro.
- Vida de **30 días** (`REFRESH_TOKEN_TTL_DAYS=30`).
- **Rotación en cada uso:** `POST /v1/auth/refresh` marca el token actual como
  revocado y emite uno nuevo en la misma transacción. Reutilizar un token
  revocado responde `401`.
- **Revocación explícita:** `POST /v1/auth/logout` revoca el refresh token
  indicado y responde `204`. Es idempotente: revocar dos veces no falla.
- El refresh token no se acepta como credencial de negocio; solo sirve en
  `/v1/auth/refresh`.

### Contraseñas

- Hash con **bcrypt**; coste 12 en producción y 4 en pruebas
  (`BCRYPT_ROUNDS`).
- Longitud mínima de 8 caracteres y máxima de 72 (límite de bcrypt).
- Los inicios de sesión con correo inexistente verifican un hash ficticio para
  reducir la diferencia de tiempo frente a un correo válido.
- `passwordHash` nunca se devuelve en respuestas ni se registra en logs.

### Registro

`POST /v1/auth/register` crea, en **una sola transacción**:

1. `User` con correo normalizado a minúsculas y único global.
2. `Merchant` con `currency = COP` y `timezone = America/Bogota` por defecto.
3. `Branch` `MAIN` del comercio.
4. `Membership` del usuario con estado `ACTIVE`.

Después emite los tokens. **No se crean roles ni permisos**: el MVP es un
teléfono-terminal con una cuenta por comercio y varios teléfonos pueden iniciar
sesión con ella (`ADR-006`). La autorización se resuelve por membresía activa y
la autoría se conserva en campos como `createdByUserId` y `AuditLog`.

Si el correo ya existe, responde `409 CONFLICT` sin revelar otros datos. Las
entradas se validan con Zod y los errores usan el formato del contrato
(`error.code`, `error.message`, `error.details`, `error.requestId`).

## Consecuencias

### Positivas

- El cliente obtiene sesión inmediata al registrarse; no hay pasos manuales.
- El acceso no consulta la base de datos en cada petición.
- La rotación limita el impacto de un refresh token filtrado.
- Registro atómico: no quedan usuarios o comercios a medias.

### Negativas o riesgos

- Un access token robado sigue siendo válido hasta 15 minutos; no hay lista de
  revocación de access tokens.
- La rotación actual no detecta reutilización de un token ya rotado para revocar
  toda la familia de sesiones; habría que añadir `familyId` si se requiere.
- No hay verificación de correo, recuperación de contraseña ni segundo factor en
  el MVP.
- El rate limiting es en memoria y por instancia: acota ataques de fuerza bruta
  pero no se comparte entre réplicas; con escalado horizontal habrá que moverlo a
  un almacén compartido (p. ej. Redis).

### Límite de intentos (rate limiting)

Para mitigar fuerza bruta se limitan solo los **intentos fallidos** de `login` y
`refresh` con una ventana deslizante en memoria (`createAttemptRateLimiter`):

- `login`: por correo (`AUTH_LOGIN_MAX_ATTEMPTS_PER_EMAIL`, 5) y por IP
  (`AUTH_LOGIN_MAX_ATTEMPTS_PER_IP`, 30); un login exitoso reinicia el contador
  del correo.
- `refresh`: por IP (`AUTH_REFRESH_MAX_ATTEMPTS_PER_IP`, 60).
- Ventana común `AUTH_RATE_LIMIT_WINDOW_SECONDS` (900 s).
- Al superar el límite se responde `429 RATE_LIMITED` con `Retry-After`.
- Las claves se derivan con SHA-256; no se guardan correos ni IP en claro ni en
  logs.

### Acciones derivadas

- [x] Implementar el módulo `auth` y montarlo en `/v1/auth` (`MVP-001`).
- [x] Guardar refresh tokens solo como hash y rotarlos en cada uso.
- [x] Crear la migración inicial de Prisma y probar el flujo contra PostgreSQL.
- [x] Añadir rate limiting en login y refresh antes de producción.
- [ ] Evaluar detección de reutilización de refresh tokens y verificación de
      correo en una fase posterior.

## Referencias

- [`docs/api/openapi.yaml`](../api/openapi.yaml) — contrato de autenticación.
- [`docs/database/data-model.md`](../database/data-model.md) — entidades
  `User`, `Membership` y `RefreshToken`.
- [`apps/api/src/modules/auth`](../../apps/api/src/modules/auth) — implementación.
- OWASP Password Storage Cheat Sheet y OWASP Session Management Cheat Sheet
  (buenas prácticas de referencia, sin copiar contenido).

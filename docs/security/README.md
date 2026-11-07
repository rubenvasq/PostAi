# Seguridad y cumplimiento

> **Estado:** requisitos iniciales. Deben revisarse con el proveedor SoftPOS y
> antes de operar en producción.

## Datos que nunca se almacenan

- PAN completo de la tarjeta.
- CVV.
- PIN.
- Credenciales del proveedor de pagos.
- Secretos en el repositorio o en logs.

## Requisitos

- Autenticación segura y gestión de tokens.
- Autorización por membresía activa al comercio; sin roles de empleado en el MVP.
- Validación de entradas en el backend.
- Rate limiting donde corresponda.
- Auditoría de acciones relevantes.
- Webhooks autenticados y verificados.
- Cifrado en tránsito (TLS).
- Secretos fuera del repositorio.
- Política de manejo y retención de datos.
- Logs sin información sensible.

## Pagos

- El backend es la fuente de verdad.
- El móvil nunca aprueba un pago por sí solo.
- Verificación del resultado con el proveedor.
- Idempotencia en operaciones críticas.
- Separación estricta sandbox/producción.
- Trazabilidad de intentos y referencias del proveedor.

## Certificaciones

- Validar requisitos de PCI MPoC cuando aplique.
- Confirmar con el proveedor y el adquirente qué certificaciones exige la app.
- Documentar la evidencia en `docs/providers/`.

## Revisión antes de producción

- [ ] Revisión de secretos y variables de entorno.
- [ ] Revisión de logs y datos personales.
- [ ] Pruebas de permisos y autorización.
- [ ] Pruebas de idempotencia y cobros duplicados.
- [ ] Pruebas de webhooks falsificados o repetidos.
- [ ] Confirmación de requisitos del proveedor.
- [ ] Política de privacidad y retención.

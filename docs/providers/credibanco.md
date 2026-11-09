# Proveedor: Credibanco

- **Estado:** En investigación
- **Última actualización:** 2026-11-08
- **Responsable:** Equipo PostAi
- **Contacto comercial:** atrecom@credibanco.com · 601 3278690 ·
  018000975806 (verificado 2026-11-07). Ver borradores y auto-servicio en
  [`PAY-002-contacto.md`](PAY-002-contacto.md).
- **Portal de desarrolladores (auto-servicio con sandbox):**
  <https://developer.credibanco.com/tap-to-phone> — registro propio que entrega
  Client ID/Secret, token SSO, sandbox y Swaggers de "Creación de terminales" y
  "Consulta de Transacciones" (API REST; el SDK Android queda bajo acuerdo).
- **Endpoint sandbox/preproducción de "Botón de pagos" (proporcionado por
  Credibanco, 2026-11-08):**
  `https://boton-pagos-3scale-preprod-apicast-staging.apps-pruebas.credibanco.com`
  — requiere credenciales/SSO; un `GET` a la raíz devuelve `403`. No confundir
  con el SDK Android de Tap to Phone. No commitear credenciales.
- **Certificación para producción (requisito del portal, 2026-11-08):** para
  obtener las credenciales de producción hay que completar el proceso de
  certificación con **dos requests exitosos por cada servicio (100 % de
  éxito)**. No se puede ejecutar hasta tener credenciales de sandbox y los
  casos de prueba definidos por Credibanco.

Adquirente/procesador colombiano (Bogotá) que ofrece "Tap to Phone" para
convertir un Android en terminal de aceptación. Es el candidato con mejor encaje
para PostAi: expone explícitamente **SDK**, **App to App (deep link)** y
**white-label**, y declara como público objetivo a los "Comercios con App
propias".

## Datos verificados

| Requisito | Respuesta | Fuente | Fecha |
| --- | --- | --- | --- |
| SoftPOS disponible en Colombia | Sí — proveedor colombiano, producto Tap to Phone | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| SDK integrable en apps Android de terceros | Sí — ofrece "SDK", "App to App (Deep Link)" y "white-label"; dirigido a "Entidades Financieras – Agregadores – Pasarelas – Comercios con App propias" | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| Versiones de Android soportadas | Android 8.1 en adelante | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| Dispositivos compatibles | Smartphones Android con NFC (sin lista de modelos publicada) | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| Requisitos de NFC/hardware | NFC obligatorio — "Admite pagos únicamente con tecnología NFC" | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| Certificaciones (PCI MPoC u otras) | Por verificar — la página no detalla el estado PCI | — | — |
| Documentación técnica | API REST pública en el marketplace (Swaggers + PDF); SDK Android bajo acuerdo | [developer.credibanco.com](https://developer.credibanco.com/tap-to-phone) | 2026-11-07 |
| Sandbox | Sí — sandbox del marketplace con registro propio (Client ID/Secret, token SSO) | [developer.credibanco.com](https://developer.credibanco.com/tap-to-phone) | 2026-11-07 |
| Onboarding del comercio | Por verificar (white-label "minimiza tiempos de implementación") | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| Costos y comisiones | Por verificar — no publicado | — | — |
| Notificación de estados | Por verificar | — | — |
| Webhooks / consulta de estado | Por verificar | — | — |
| Reembolsos | Por verificar | — | — |
| Liquidaciones y conciliación | Por verificar | — | — |
| Requisitos de publicación/producción | Certificación obligatoria: dos requests exitosos por cada servicio (100 % de éxito) antes de entregar credenciales de producción | Mensaje del portal de Credibanco (2026-11-08) | 2026-11-08 |

## Notas

- Tarjetas aceptadas: "todas las tarjetas Visa, Amex y MasterCard"
  (credibanco.com, 2026-11-07).
- Monto máximo publicado por transacción: $250.000 COP (credibanco.com,
  2026-11-07). Verificar si es límite de producto o configurable por comercio.
- Las tres modalidades (SDK / deep link / white-label) permiten adaptar el nivel
  de integración: el **SDK** es el que habilita incrustar la aceptación dentro
  de la app PostAi.
- Ventaja estratégica: proveedor local colombiano → onboarding, soporte y
  liquidación en el mercado objetivo, sin intermediar un adquirente extranjero.

## Certificación para producción

Requisito informado por Credibanco (2026-11-08):

- Completar el proceso de certificación **antes** de obtener credenciales de
  producción.
- Ejecutar **dos requests por cada servicio**, ambos con **100 % de éxito**.
- Aplica a las APIs del marketplace; el **SDK Android** de Tap to Phone sigue
  bajo acuerdo comercial (`PAY-002`).

Por confirmar con Credibanco:

- [ ] Qué servicios exactos entran en la certificación (p. ej. creación de
      terminales y consulta de transacciones).
- [ ] Rutas, contratos y ambientes (sandbox/preproducción) de cada servicio.
- [ ] Casos de prueba oficiales y datos de prueba.
- [ ] Evidencia esperada (logs, request/response, identificadores).
- [ ] Si la certificación cubre también "Botón de pagos" o solo las APIs del
      marketplace.
- [ ] Vigencia y alcance de las credenciales de producción.

No ejecutar requests de certificación hasta contar con `Client ID`/`Client
Secret` de sandbox y los casos de prueba oficiales. No commitear credenciales.

## Documentación recibida

- [ ] Documentación técnica.
- [ ] SDK y versiones.
- [ ] Credenciales sandbox.
- [ ] Casos de prueba de certificación.
- [ ] Contrato o términos comerciales.

## Decisión

Pendiente. Candidato prioritario por ser adquirente local con SDK y foco
declarado en "comercios con app propia". No integrar hasta confirmar estado PCI
MPoC, documentación/SDK, sandbox, dispositivos y condiciones comerciales
(PAY-002 a PAY-005).

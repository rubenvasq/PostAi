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
| Notificación de estados | Botón de pagos: callbacks con `mdOrder`, `orderNumber`, `operation` y `status`; el comercio debe responder HTTP 200 | PDF «Botón de Pagos 2.0», §9 | 2026-11-08 |
| Webhooks / consulta de estado | Botón de pagos: `v1/Pago/Boton/EstadoPago` y callbacks con reintentos hasta 6 fallos | PDF «Botón de Pagos 2.0», §7.6 y §9 | 2026-11-08 |
| Reembolsos | Botón de pagos: anulación total, una sola vez y dentro de una ventana a confirmar; el SDK Android sigue por verificar | PDF «Botón de Pagos 2.0», §7.5 | 2026-11-08 |
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

## API «Botón de pagos» — documentación recibida (2026-11-08)

Credibanco entregó el PDF **«Documentación API Botón de Pagos 2.0»** (100
páginas). Es la especificación de una **pasarela de pagos web/API REST (iPay)**,
**no** del SDK Android de Tap to Phone. Hallazgos verificados en el documento:

### Naturaleza y alcance

- El flujo permitido es el **tradicional con redirección**: el comercio registra
  el pedido, recibe un `formUrl` y redirige el navegador del pagador a la página
  alojada de Credibanco. Los datos de la tarjeta se capturan en esa página, no en
  la app del comercio. **No se permite** el botón en ventana modal.
- Existe un modo alternativo **server-side** para comercios/gateways que ya son
  PCI (`v1/Pago/Boton/Comercios/PCI`): en ese caso el comercio recoge y transmite
  los datos de la tarjeta. **PostAi no debe usar este modo** (regla del proyecto:
  no almacenar ni procesar PAN/CVV).
- No hay NFC ni captura presencial: no sustituye al SoftPOS/Tap to Phone. El SDK
  Android continúa bajo acuerdo comercial (`PAY-002`).

### Autenticación SSO

- El endpoint de autenticación de cada ambiente se **solicita al comercial
  asignado**; el PDF no publica URLs.
- Headers: `Operación: 1` (identificador de Botón de pagos), `Client_id` y
  `Client_secret`.
- Respuesta: `access_token` (vigencia **300 s**), `refresh_token` (vigencia
  **1.800 s**), `token_type: Bearer`, `expires_in`, `refresh_expires_in`.
- Códigos: `200` generación exitosa, `400` credenciales inválidas / client no
  permitido, `401` no autorizado, `403` forbidden, `500` error interno.

### Servicios REST

| Servicio | Propósito | Notas |
| --- | --- | --- |
| `v1/Creacion/Comercio/ipay` | Alta del comercio/usuario en iPay | Devuelve usuarios `API` y `OPERATOR` con contraseña temporal; hay que cambiarla en Ecouat antes de consumir cualquier otro servicio. Es un alta única, no por venta. |
| `v1/Pago/Boton` | Registro del pedido | Recibe credenciales del usuario `API`, `orderNumber`, importe, divisa y URL de retorno; devuelve el identificador del pedido y el `formUrl` para el pagador. |
| `v1/Pago/Boton/EstadoPago` | Consulta del estado del pedido | Equivale a `getOrderStatusExtended`. |
| `v1/Pago/Boton/Anulacion` | Anulación del pago | Solo **total**, **una sola vez** y dentro de una ventana que Credibanco debe confirmar; si la primera falla no se puede reintentar. |
| `v1/Pago/Boton/Comercios/PCI` | Pago server-side con datos de tarjeta | Solo para gateways PCI; **descartado para PostAi**. |

### Flujo de una orden

1. Registro del pedido con importe, divisa, número de pedido del comercio y URL
   de retorno.
2. Redirección del pagador al `formUrl` alojado.
3. El pagador completa el pago en la página de Credibanco y vuelve al comercio.
4. El comercio consulta `EstadoPago` hasta obtener un estado final.
5. Hay **20 minutos** desde el registro para pagar; pasado el plazo el pago se
   considera fallido.
6. Se recomienda consultar el estado **durante al menos 30 minutos** hasta
   obtener un estado final.

Estados finales de tarjeta: **`2` aprobada**, **`6` rechazada**, **`4`
anulada**. Para PSE existe además **`7` pendiente** y no se permite anulación.

### Callbacks

- Parámetros: `mdOrder` (pedido en Credibanco), `orderNumber` (pedido del
  comercio), `operation` (`approved`, `deposited`, `reversed`, `refunded`) y
  `status` (`1` éxito, `0` error).
- El receptor debe ser **HTTPS** y responder **HTTP 200**; cualquier otra
  respuesta se considera fallida.
- Reintentos cada `10 * A` minutos (10, 20, 30…) hasta recibir `200` o acumular
  **6 fallos**.

### Límites y datos de prueba

- Las URLs de prueba y producción figuran como **«Solicitar a tu comercial
  asignado»**; no están publicadas en el PDF.
- Las tarjetas de prueba están en **imágenes** (páginas 80–81) y no se pudieron
  extraer como texto; hay que solicitarlas a Credibanco y **no** copiarlas al
  repositorio.
- El PDF incluye tokens de ejemplo; no deben copiarse ni reutilizarse.
- La anulación no admite importes parciales.

## Relevancia para PostAi

- **No es el camino SoftPOS**: no hay NFC, SDK Android ni captura presencial. La
  app Android de PostAi no debe integrar esta API para cobros presenciales.
- **Posible uso futuro como pagos web/enlace** (cobro remoto, catálogo o link de
  pago) si el negocio lo requiere; en ese caso, usar siempre el `formUrl`
  alojado y nunca el endpoint PCI.
- Antes de cualquier integración hay que confirmar: certificación exigida,
  credenciales, URLs por ambiente, casos de prueba, condiciones comerciales y
  modelo de liquidación/reembolsos.
- El backend seguiría siendo la fuente de verdad: registrar la orden, conciliar
  el callback con `EstadoPago` (el callback no es la única fuente), procesar
  callbacks con idempotencia y no confiar en el retorno del navegador.

## Certificación para producción

Requisito informado por Credibanco (2026-11-08):

- Completar el proceso de certificación **antes** de obtener credenciales de
  producción.
- Ejecutar **dos requests por cada servicio**, ambos con **100 % de éxito**.
- Aplica a las APIs del marketplace; el **SDK Android** de Tap to Phone sigue
  bajo acuerdo comercial (`PAY-002`).

El PDF de «Botón de pagos» **no describe** el proceso de certificación; el
requisito de los dos requests por servicio proviene del mensaje del portal. Por
confirmar con Credibanco:

- [ ] Qué servicios exactos entran en la certificación (p. ej. creación de
      terminales, consulta de transacciones y/o los servicios de Botón de pagos).
- [ ] Rutas, contratos y ambientes (sandbox/preproducción) de cada servicio, que
      en el PDF aparecen como «Solicitar a tu comercial asignado».
- [ ] Casos de prueba oficiales y datos de prueba, incluidas las tarjetas de
      prueba que están en imágenes.
- [ ] Evidencia esperada (logs, request/response, identificadores).
- [ ] Si la certificación cubre también «Botón de pagos» o solo las APIs del
      marketplace.
- [ ] Vigencia y alcance de las credenciales de producción.

No ejecutar requests de certificación hasta contar con `Client ID`/`Client
Secret` de sandbox y los casos de prueba oficiales. No commitear credenciales.

## Documentación recibida

- [x] Documentación técnica: PDF «Documentación API Botón de Pagos 2.0»
  (2026-11-08, 100 páginas). Cubre autenticación SSO, servicios REST, flujo de
  orden, anulación, estados, callbacks, códigos de respuesta e instituciones
  financieras. **No** cubre el SDK Android ni el proceso de certificación.
- [ ] SDK Android y versiones.
- [ ] Credenciales sandbox.
- [ ] Casos de prueba de certificación.
- [ ] Contrato o términos comerciales.
- [ ] URLs de prueba y producción (solicitar al comercial asignado).

## Decisión

El PDF recibido corresponde a **«Botón de pagos» (pagos web/API)**, no al SDK
Android de Tap to Phone; por sí solo no habilita el cobro presencial NFC de
PostAi. Se mantiene como **candidato prioritario** por ser adquirente local con
SDK y foco declarado en "comercios con app propia", pero no se integra hasta
confirmar estado PCI MPoC, acceso al SDK Android, sandbox, dispositivos y
condiciones comerciales (PAY-002 a PAY-005). El flujo web con `formUrl` queda
como posible funcionalidad futura de pagos remotos, nunca el endpoint PCI.

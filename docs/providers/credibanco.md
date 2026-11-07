# Proveedor: Credibanco

- **Estado:** En investigación
- **Última actualización:** 2026-11-07
- **Responsable:** Equipo PostAi
- **Contacto comercial:** _(pendiente — solicitar en PAY-002)_

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
| Documentación técnica | Por verificar — no pública (solicitar bajo acuerdo) | — | — |
| Sandbox | Por verificar | — | — |
| Onboarding del comercio | Por verificar (white-label "minimiza tiempos de implementación") | [credibanco.com](https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/) | 2026-11-07 |
| Costos y comisiones | Por verificar — no publicado | — | — |
| Notificación de estados | Por verificar | — | — |
| Webhooks / consulta de estado | Por verificar | — | — |
| Reembolsos | Por verificar | — | — |
| Liquidaciones y conciliación | Por verificar | — | — |
| Requisitos de publicación/producción | Por verificar | — | — |

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

## Documentación recibida

- [ ] Documentación técnica.
- [ ] SDK y versiones.
- [ ] Credenciales sandbox.
- [ ] Contrato o términos comerciales.

## Decisión

Pendiente. Candidato prioritario por ser adquirente local con SDK y foco
declarado en "comercios con app propia". No integrar hasta confirmar estado PCI
MPoC, documentación/SDK, sandbox, dispositivos y condiciones comerciales
(PAY-002 a PAY-005).

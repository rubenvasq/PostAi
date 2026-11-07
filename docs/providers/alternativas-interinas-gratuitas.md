# Alternativas gratuitas interinas (mientras se valida SoftPOS)

- **Última actualización:** 2026-11-07
- **Responsable:** Equipo PostAi
- **Objetivo:** dejar el cobro **funcional ya, sin costo de entrada**, mientras
  se valida el SoftPOS real (Credibanco / Symbiotic, ver fichas). El SoftPOS
  tap-to-phone queda como el paso robusto posterior.

## Contexto

El SoftPOS real (aceptar tarjeta sin contacto sobre el propio teléfono) exige
contrato con un adquirente, acceso a SDK bajo acuerdo, certificación PCI MPoC y
tiempos comerciales. Nada de eso es inmediato ni gratuito.

Para tener el flujo de pago operativo hoy hay dos caminos gratuitos, que **no
requieren SoftPOS ni certificación PCI del lado de PostAi**:

## Nivel 0 — Pago simulado (ya implementado, 0 costo, 0 registro)

- El backend ya soporta el método `CARD_SIMULATED` (`ADR-007`): aprueba el pago,
  marca la venta `PAID`, descuenta inventario y genera comprobante.
- Sirve para demos, pruebas de extremo a extremo y para operar el POS sin dinero
  real. Es la opción verdaderamente "gratis de momento" y no depende de terceros.
- Limitación: no mueve dinero real. Es un stub.

## Nivel 1 — Pasarela con sandbox gratis y sin mensualidad (dinero real)

Pasarelas colombianas que se **integran gratis** (cuenta y sandbox sin costo,
sin mensualidad) y solo cobran **comisión por transacción aprobada** en
producción. Aceptan pago por **QR, link de pago, PSE, Nequi y tarjeta** — todo
sin tocar el flujo SoftPOS (que sigue devolviendo `501`).

| Pasarela | Sandbox gratis | Mensualidad | Medios (Colombia) | Para integrar | Fuente | Fecha |
| --- | --- | --- | --- | --- | --- | --- |
| **Wompi** (Bancolombia) | Sí | No | Tarjeta, PSE, Nequi, Daviplata, transferencia y **QR** Bancolombia, efectivo, BNPL | API REST + **Payment Links API** (`checkout.wompi.co/l/...`) + QR en base64 | [docs.wompi.co](https://docs.wompi.co/en/docs/colombia/sandbox-pagos-a-terceros/), [wompi.com/es/co/desarrolladores](https://wompi.com/es/co/desarrolladores/), [docs.wompi.co/metodos-de-pago](https://docs.wompi.co/en/docs/colombia/metodos-de-pago/) | 2026-11-07 |
| **Mercado Pago** | Sí (cuentas de prueba vendedor/comprador) | No | Tarjeta, **QR presencial**, Efecty, wallet | Checkout API + **QR API** con webhooks de estado | [mercadopago.com.co/developers](https://www.mercadopago.com.co/developers/es/docs/checkout-api/landing), [getting-started](https://www.mercadopago.com.co/developers/en/docs/getting-started) | 2026-11-07 |
| **ePayco** | Sí (modo prueba) | No (plan básico) | Tarjeta, PSE, efectivo | Plugins y SDKs sin costo; comisión por transacción | [epayco.com/desarrolladores](https://epayco.com/desarrolladores/) | 2026-11-07 |
| **PayU LATAM** | Sí (`sandbox.api.payulatam.com`) | Por verificar | Tarjeta (Visa, MC, Amex, Diners, Codensa), PSE | API y SDK de pagos con tarjetas de prueba | [developers.payulatam.com](https://developers.payulatam.com/latam/es/docs/getting-started/test-your-solution.html) | 2026-11-07 |

Notas verificadas:

- **Wompi:** "crear una cuenta gratis y usar el entorno de pruebas"; sandbox que
  replica producción sin cargos reales; Payment Links API para links
  compartibles de monto fijo o abierto; soporta QR Bancolombia en base64.
- **Mercado Pago:** sandbox con cuentas de prueba (vendedor y comprador) y
  credenciales de test; API de QR presencial con consulta de estado por pedido y
  **webhooks**.
- **ePayco:** "crear cuenta y usar plugins/SDK no tiene costo; se paga comisión
  por transacción aprobada"; activación en 24–48 h; sin mensualidad en el plan
  básico.
- **PayU:** entorno sandbox dedicado y tarjetas de prueba para Colombia.

## Recomendación

1. **Hoy:** seguir con `CARD_SIMULATED` para que el POS funcione completo en
   demos y pruebas, sin depender de nadie.
2. **Primer cobro real gratis:** integrar **Wompi** como método de pago
   adicional (link de pago y/o QR Bancolombia + Nequi + PSE). Es gratis de
   integrar, sin mensualidad, con sandbox, y al ser de Bancolombia da confianza
   local. Mercado Pago es la alternativa equivalente si se prefiere QR + wallet.
3. **Después (robusto):** SoftPOS tap-to-phone con **Credibanco** o
   **Symbiotic** para cobrar tarjeta sin contacto sobre el propio teléfono.

Esto encaja con el contrato interno `PaymentProvider` (`ARQ-004`): QR/links se
suman como un proveedor más, sin alterar el camino SoftPOS (que sigue en `501`
hasta validarse).

## Importante

- QR, links, PSE y Nequi **no son** aceptación de tarjeta sin contacto (SoftPOS).
  Resuelven el cobro de forma gratuita e inmediata, pero no sustituyen el
  objetivo final del producto.
- Ninguna de estas integraciones debe guardar datos sensibles de tarjeta (PAN,
  CVV, PIN). El cobro ocurre del lado de la pasarela; PostAi solo guarda
  referencias y estados.

# PAY-002 — Contacto y acceso a SDK/sandbox

- **Última actualización:** 2026-11-11
- **Responsable:** Equipo PostAi
- **Objetivo:** obtener documentación técnica, acceso al SDK/API y credenciales
  de sandbox de los candidatos prioritarios (Credibanco y Symbiotic) y confirmar
  estado PCI MPoC y modelo de contratación en Colombia.

> Nota: el envío de los correos y el registro de cuentas lo realiza una persona
> del Equipo PostAi (requiere identidad y buzón propios). Este documento deja
> listos los canales verificados, la vía de auto-servicio y los borradores.

## Credibanco — hay vía de AUTO-SERVICIO (no requiere esperar correo)

Credibanco expone un **marketplace de APIs para desarrolladores** con sandbox y
registro inmediato. Esto permite empezar a validar la integración **hoy y gratis**,
en paralelo al contacto comercial.

- **Portal de desarrolladores:** <https://developer.credibanco.com/tap-to-phone>
- **Qué ofrece (verificado 2026-11-07):**
  - Registro propio ("Crea tu cuenta") que entrega **Client ID**, **Client
    Secret** y endpoint de API, con generación de **token SSO**.
  - **Sandbox** del marketplace para validar antes de producción.
  - **Swaggers** de dos servicios: "Creación de terminales" y "Consulta de
    Transacciones", con botón "Probar".
  - PDF de documentación descargable.
- **Límite conocido:** el portal expone **API REST** (crear terminal, consultar
  transacción). El **SDK Android** para incrustar la aceptación tap-to-phone en
  la app PostAi (y el estado PCI MPoC, dispositivos y condiciones comerciales)
  sigue requiriendo acuerdo → eso es lo que pide el correo comercial de abajo.
- **Endpoint sandbox de "Botón de pagos" (dado por Credibanco, 2026-11-08):**
  `https://boton-pagos-3scale-preprod-apicast-staging.apps-pruebas.credibanco.com`.
  Es un endpoint de API protegido: el `GET` a la raíz responde `403`, así que hay
  que autenticarse con el token SSO/credenciales del marketplace antes de
  consumirlo. No es el SDK Android y no se commitean credenciales.
- **Certificación para producción (2026-11-08):** el portal exige completar la
  certificación con **dos requests exitosos por cada servicio (100 % de éxito)**
  antes de entregar credenciales de producción. Requiere credenciales de sandbox
  y los casos de prueba de Credibanco; aún no se ha ejecutado. Checklist y
  preguntas abiertas en [`credibanco.md`](credibanco.md#certificación-para-producción).
- **Documentación recibida (2026-11-08):** PDF «Documentación API Botón de Pagos
  2.0» (100 páginas). Describe la **pasarela web/API REST (iPay)** —SSO, registro
  de pedido con `formUrl`, consulta de estado, anulación total y callbacks—, **no**
  el SDK Android. Resumen verificado, límites y relevancia en
  [`credibanco.md`](credibanco.md#api-botón-de-pagos--documentación-recibida-2026-11-08).

### Pasos de auto-servicio (hacer primero)

0. Enviar el **formulario de registro de Tap to Phone**
   (<https://www.credibanco.com/soluciones-pagos-punto-venta-y-domicilio/tap-to-phone/formulario-de-registro/>):
   nombres, empresa, NIT/CC + DV, correo, teléfono, si el comercio está afiliado
   al Sistema de Pagos de Bajo Valor y su banco adquirente. Es el único canal
   publicado para el SDK (revisado 2026-11-11); Credibanco llama después.
1. Entrar a <https://developer.credibanco.com/tap-to-phone> y "Crea tu cuenta".
2. Guardar `Client ID` / `Client Secret` del sandbox (nunca commitearlos; van en
   `.env` local, fuera del repo).
3. Generar token SSO y probar los Swaggers de "Creación de terminales" y
   "Consulta de Transacciones".
4. Descargar el PDF de documentación y anexarlo (o resumirlo) en `credibanco.md`.
5. Registrar en `credibanco.md` qué cubre la API REST y qué queda solo para el
   SDK Android bajo acuerdo.
6. Pedir a Credibanco los casos de prueba y el detalle de la **certificación
   para producción** (dos requests exitosos por servicio) y planificarla cuando
   haya credenciales de sandbox.

### Canales de contacto comercial/técnico (verificados 2026-11-07)

- **Soporte a desarrolladores:** 601 5803359 · 601 6024914 (opción 1,1,3) ·
  gratuita 018000975806.
- **Correo comercial / PQRS:** atrecom@credibanco.com ·
  servicio.cliente@credibanco.com.
- **Comercios:** 601 3278690 · 018000975806 (opción 4).
- **Dirección:** Carrera 68 75 A 50, Metrópolis, Bogotá.
- Alianza tecnológica declarada con **Yazara** (software de pagos) y foco en
  "aplicaciones de bancos, fintech y terceros".
- **Chebre** (agregador de Credibanco con app Tap to Phone propia, revisado
  2026-11-11): 601 796 5016 · WhatsApp 315 555 4824 · contacto@chebre.com.
  Referencia de condiciones (2,5 % + retenciones, abono el mismo día antes de
  las 3:00 p. m.) y alternativa por deep link/marca blanca si el SDK no se
  entrega a comercios pequeños; detalle en
  [`credibanco.md`](credibanco.md#revisión-de-credibancocom-2026-11-11).

### Borrador de correo — Credibanco (comercial + técnico)

> **Para:** atrecom@credibanco.com
> **Asunto:** Solicitud de integración Tap to Phone (SDK Android) — PostAi
>
> Buen día,
>
> Somos PostAi, un software de punto de venta para comercios en Colombia.
> Queremos integrar **Tap to Phone** incrustando la aceptación de pago dentro de
> nuestra app Android (modelo "comercio con app propia"). Ya creamos una cuenta
> en su marketplace de desarrolladores y estamos probando las APIs de creación
> de terminales y consulta de transacciones en sandbox.
>
> Para avanzar necesitamos confirmar:
>
> 1. Acceso al **SDK de Android** (no solo API REST) para incrustar la aceptación
>    NFC en nuestra app, con su documentación de integración.
> 2. Estado y evidencia de **certificación PCI MPoC** de la solución.
> 3. **Dispositivos y versiones de Android** soportados (más allá de 8.1+).
> 4. **Modelo de contratación** en Colombia y **condiciones comerciales**
>    (comisiones, liquidaciones, límite por transacción —vimos $250.000 COP—).
> 5. Soporte de **reembolsos**, **webhooks/consulta de estado** y conciliación.
> 6. Proceso de **certificación para producción**: servicios incluidos, casos de
>    prueba y evidencia requerida (entendemos que son dos requests exitosos por
>    cada servicio).
> 7. Si PostAi puede integrar como **comercio con app propia** sin ser
>    agregador ni pasarela, y si nuestros comercios requieren afiliación previa
>    al Sistema de Pagos de Bajo Valor con un banco adquirente.
> 8. Diferencias de condiciones entre el **SDK** y las vías **App to App (deep
>    link)** o **marca blanca**, y si estas últimas aplican sobre la app Chebre.
>
> Agradecemos agendar una llamada técnica/comercial. Quedamos atentos.
>
> [Nombre] — Equipo PostAi · [correo] · [teléfono]

## Symbiotic — solo contacto comercial (B2B2C)

No hay auto-servicio público; el SDK se habilita vía acuerdo (típicamente a
través de un adquirente/agregador).

- **Correo comercial:** sales@symbiotic.com (verificado 2026-11-07).
- **Web:** <https://www.symbiotic.com/tap-on-phone-en/>
- Declara **PCI CPoC** y **MPoC**, Visa Ready; operación en LATAM incluida
  Colombia.

### Borrador de correo — Symbiotic

> **To:** sales@symbiotic.com
> **Subject:** Tap on Phone (Android SDK) integration request — PostAi (Colombia)
>
> Hello,
>
> We are PostAi, a point-of-sale app for merchants in Colombia. We want to embed
> **Tap on Phone** acceptance into our own Android app via your **SDK**. Could
> you help us confirm:
>
> 1. Direct integration terms in Colombia — can PostAi contract directly, or is
>    an acquirer/aggregator required behind the SDK?
> 2. **Android SDK** access and technical documentation.
> 3. **PCI MPoC/CPoC** certification evidence and scope.
> 4. Supported **Android versions/devices**.
> 5. **Sandbox** credentials to start testing.
> 6. Support for **refunds**, **webhooks/status query**, settlement and pricing.
>
> We'd appreciate scheduling a technical/commercial call. Thank you.
>
> [Name] — PostAi team · [email] · [phone]

## Alternativa de cobro inmediata (dinero real, gratis)

Independiente del SoftPOS: para cobrar **ya** sin certificación propia, integrar
**Wompi** (Bancolombia) como método adicional (link de pago / QR / Nequi / PSE),
sandbox gratis y sin mensualidad. Detalle y comparativa en
[`alternativas-interinas-gratuitas.md`](alternativas-interinas-gratuitas.md).
El camino SoftPOS sigue devolviendo `501` hasta validarse.

## Próximos pasos

1. **Hoy (sin bloqueo):** registrarse en el marketplace de Credibanco y probar
   el sandbox; anexar hallazgos a `credibanco.md`.
2. Enviar los dos correos (Credibanco y Symbiotic) para SDK Android, PCI,
   condiciones comerciales y detalle de la **certificación para producción**.
3. Con credenciales de sandbox y los casos de prueba, ejecutar la certificación
   (dos requests exitosos por servicio) para habilitar producción.
4. Si se quiere cobro real ya, arrancar la integración de Wompi en paralelo.
5. Con la respuesta de SDK real, retomar `ARQ-001` (stack móvil) y `ARQ-004`
   (contrato interno `PaymentProvider`).

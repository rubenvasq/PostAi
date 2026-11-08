# PAY-002 — Contacto y acceso a SDK/sandbox

- **Última actualización:** 2026-11-07
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

### Pasos de auto-servicio (hacer primero)

1. Entrar a <https://developer.credibanco.com/tap-to-phone> y "Crea tu cuenta".
2. Guardar `Client ID` / `Client Secret` del sandbox (nunca commitearlos; van en
   `.env` local, fuera del repo).
3. Generar token SSO y probar los Swaggers de "Creación de terminales" y
   "Consulta de Transacciones".
4. Descargar el PDF de documentación y anexarlo (o resumirlo) en `credibanco.md`.
5. Registrar en `credibanco.md` qué cubre la API REST y qué queda solo para el
   SDK Android bajo acuerdo.

### Canales de contacto comercial/técnico (verificados 2026-11-07)

- **Soporte a desarrolladores:** 601 5803359 · 601 6024914 (opción 1,1,3) ·
  gratuita 018000975806.
- **Correo comercial / PQRS:** atrecom@credibanco.com ·
  servicio.cliente@credibanco.com.
- **Comercios:** 601 3278690 · 018000975806 (opción 4).
- **Dirección:** Carrera 68 75 A 50, Metrópolis, Bogotá.
- Alianza tecnológica declarada con **Yazara** (software de pagos) y foco en
  "aplicaciones de bancos, fintech y terceros".

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
2. Enviar los dos correos (Credibanco y Symbiotic) para SDK Android, PCI y
   condiciones comerciales.
3. Si se quiere cobro real ya, arrancar la integración de Wompi en paralelo.
4. Con la respuesta de SDK real, retomar `ARQ-001` (stack móvil) y `ARQ-004`
   (contrato interno `PaymentProvider`).

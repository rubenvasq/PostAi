# Proveedor: SumUp

- **Estado:** En investigación
- **Última actualización:** 2026-11-07
- **Responsable:** Equipo PostAi
- **Contacto comercial:** _(pendiente)_

Proveedor de pagos con Tap to Pay on Android disponible en Colombia mediante su
**propia app**. Encaje con PostAi limitado: no hay evidencia de un SDK para
incrustar la aceptación en una app de terceros; de confirmarse solo su app,
quedaría fuera del modelo de PostAi (integración en app propia).

## Datos verificados

| Requisito | Respuesta | Fuente | Fecha |
| --- | --- | --- | --- |
| SoftPOS disponible en Colombia | Sí — Tap to Pay on Android disponible en Colombia (y Chile) | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| SDK integrable en apps Android de terceros | Por verificar — la documentación pública solo describe la app propia de SumUp | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| Versiones de Android soportadas | Android 11 o superior con NFC | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| Dispositivos compatibles | Teléfonos y tablets Android con NFC | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| Requisitos de NFC/hardware | NFC integrado obligatorio | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| Certificaciones (PCI MPoC u otras) | Por verificar | — | — |
| Documentación técnica | Por verificar (existe sección "Developers", alcance sin confirmar) | — | — |
| Sandbox | Por verificar | — | — |
| Onboarding del comercio | Alta digital; activación de Tap to Pay on Android "100% gratis" | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| Costos y comisiones | 2,49% + IVA tarjetas locales; 3,2% + IVA internacionales; sin mensualidad ni contrato | [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/), [sumup.com](https://www.sumup.com/es-cl/tap-to-pay/tap-to-pay-on-android/merchants/) | 2026-11-07 |
| Notificación de estados | Por verificar | — | — |
| Webhooks / consulta de estado | Por verificar | — | — |
| Reembolsos | Por verificar | — | — |
| Liquidaciones y conciliación | Por verificar | — | — |
| Requisitos de publicación/producción | Por verificar | — | — |

## Notas

- Marcas/wallets: Visa, Mastercard, American Express, Google Pay, Samsung Pay y
  otras billeteras (sumup.com, 2026-11-07).
- Comisión pública transparente, útil como referencia de mercado para PAY-005
  aunque no se use como proveedor de integración.
- Clave a resolver en PAY-002: ¿SumUp ofrece un SDK/API de Tap to Pay para
  integrar en apps de terceros en Colombia, o solo su app? Si es solo su app,
  pasa a `Descartado` para el modelo de PostAi.

## Documentación recibida

- [ ] Documentación técnica.
- [ ] SDK y versiones.
- [ ] Credenciales sandbox.
- [ ] Contrato o términos comerciales.

## Decisión

Pendiente. Prioridad menor frente a Credibanco y Symbiotic salvo que confirme un
SDK de integración para terceros en Colombia.

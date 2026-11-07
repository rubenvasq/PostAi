# Proveedor: Symbiotic

- **Estado:** En investigación
- **Última actualización:** 2026-11-07
- **Responsable:** Equipo PostAi
- **Contacto comercial:** _(pendiente — solicitar en PAY-002)_

Habilitador de aceptación de pagos (payment acceptance platform) fundado en
Costa Rica en 2016, con operación en LATAM y España. Ofrece Tap on Phone
(Android) para bancos, adquirentes, PayFacs, agregadores y comercios. Es uno de
los dos candidatos que exponen **SDK** para integrar en una app Android propia
(junto con Credibanco), por lo que encaja con el modelo de PostAi.

## Datos verificados

| Requisito | Respuesta | Fuente | Fecha |
| --- | --- | --- | --- |
| SoftPOS disponible en Colombia | Sí — Colombia figura entre los países de operación | [symbiotic.com](https://www.symbiotic.com/en) | 2026-11-07 |
| SDK integrable en apps Android de terceros | Sí — "White label, SDK or deep link" | [symbiotic.com](https://www.symbiotic.com/en) | 2026-11-07 |
| Versiones de Android soportadas | Por verificar | — | — |
| Dispositivos compatibles | Por verificar | — | — |
| Requisitos de NFC/hardware | NFC (Tap on Phone sin lector externo) | [symbiotic.com](https://www.symbiotic.com/en) | 2026-11-07 |
| Certificaciones (PCI MPoC u otras) | El sitio declara "MPoC certified" y "First CPoC in the Americas" (abr 2021); también Cybersource VPC y Visa Ready. **Verificar con documento/listado PCI oficial** | [symbiotic.com](https://www.symbiotic.com/en), [partner.visa.com](https://partner.visa.com/site/partner-directory/symbiotic.html) | 2026-11-07 |
| Documentación técnica | Por verificar — no publicada abiertamente | — | — |
| Sandbox | Por verificar | — | — |
| Onboarding del comercio | Por verificar (modelo B2B2C: se integra vía institución/adquirente) | — | — |
| Costos y comisiones | Por verificar (no publicado; modelo mayorista) | — | — |
| Notificación de estados | Por verificar | — | — |
| Webhooks / consulta de estado | Por verificar | — | — |
| Reembolsos | Por verificar | — | — |
| Liquidaciones y conciliación | Por verificar | — | — |
| Requisitos de publicación/producción | Por verificar | — | — |

## Notas

- Tarjetas declaradas: Visa, Mastercard, Amex, Discover, Diners, Elo (fuente:
  symbiotic.com, 2026-11-07).
- Primicia en LATAM/Europa como habilitador multi-país; reporta 18 conexiones
  certificadas con procesadores (Cielo, Evertec, Cybersource, PlacetoPay, etc.).
- Aparece en la lista oficial de Apple de proveedores de Tap to Pay on iPhone
  para Colombia (y CR, GT, HN, PA). Para PostAi interesa su **Tap on Phone de
  Android con SDK**, no el producto iOS.
- Discrepancia a resolver: un comunicado anterior indicaba "en camino a MPoC",
  mientras el sitio actual declara "MPoC certified". Confirmar el estado real y
  el alcance (solución vs. componente) con documentación/listado PCI.
- Modelo típicamente B2B2C: el SDK se habilita a través de una entidad
  adquirente/agregador. Hay que confirmar si PostAi puede contratar directo o
  requiere un adquirente colombiano detrás.

## Documentación recibida

- [ ] Documentación técnica.
- [ ] SDK y versiones.
- [ ] Credenciales sandbox.
- [ ] Contrato o términos comerciales.

## Decisión

Pendiente. Candidato prioritario junto con Credibanco por ofrecer SDK. No
integrar hasta confirmar: versiones de Android, estado PCI MPoC con evidencia,
sandbox/documentación, modelo de contratación en Colombia y condiciones
comerciales (PAY-002 a PAY-005).

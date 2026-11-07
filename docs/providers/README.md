# Proveedores SoftPOS

Registro de la investigación de proveedores para aceptación de pagos sin
contacto en Android, con foco en **Colombia**.

> **Estado:** sin proveedor seleccionado ni soporte confirmado.
> Los proveedores listados están **en investigación** (PAY-001): hay hallazgos
> verificados con fuente y fecha, pero ninguno validado ni aprobado para
> integrar. Varios requisitos clave siguen `Por verificar` (ver cada ficha).

> **Criterio de encaje con PostAi:** PostAi necesita **incrustar** la aceptación
> sin contacto en su **propia app Android**, por lo que se prioriza a los
> proveedores que ofrecen **SDK para terceros**. Las soluciones que solo operan
> mediante la app del propio proveedor tienen encaje limitado hasta confirmar si
> exponen un SDK/programa de integración.

## Reglas de este registro

- Solo se registra información **verificada**, con fuente y fecha.
- No se asumen capacidades por marketing, nombres de producto ni conocimiento
  general.
- Lo no confirmado se marca explícitamente como `Por verificar`.
- No se implementa ninguna integración hasta confirmar soporte para Colombia,
  acceso al SDK y condiciones comerciales.
- Cada proveedor evaluado debe tener su propia ficha basada en
  [`_plantilla-proveedor.md`](_plantilla-proveedor.md).

## Candidatos

Resumen al 2026-11-07. "SDK para apps de terceros" es el criterio de encaje con
PostAi. Detalle y fuentes en cada ficha.

| Proveedor | SoftPOS en Colombia | SDK para apps de terceros | Sandbox | Documentación | Estado |
| --- | --- | --- | --- | --- | --- |
| [Credibanco](credibanco.md) | Sí (verificado) | Sí — SDK, deep link y white-label (verificado) | Por verificar | Por verificar | En investigación — prioritario |
| [Symbiotic](symbiotic.md) | Sí (verificado) | Sí — SDK, white-label y deep link (verificado) | Por verificar | Por verificar | En investigación — prioritario |
| [SumUp](sumup.md) | Sí (verificado) | Por verificar (solo app propia en docs públicas) | Por verificar | Por verificar | En investigación |
| [Redeban](redeban.md) | Sí (verificado) | Por verificar (app propia) | Por verificar | Por verificar | En investigación |
| [Bold](bold.md) | Sí (verificado) | Por verificar (app propia) | Por verificar | Por verificar | En investigación |

## Checklist obligatorio por proveedor

1. ¿Ofrece SoftPOS para comercios en Colombia?
2. ¿Permite integrar su SDK en una aplicación Android de terceros?
3. ¿Qué versiones de Android y dispositivos admite?
4. ¿Qué requisitos de NFC, hardware y seguridad exige?
5. ¿Qué certificaciones aplica, incluyendo PCI MPoC cuando corresponda?
6. ¿Ofrece documentación técnica y entorno sandbox?
7. ¿Cómo funciona el onboarding y la vinculación del comercio?
8. ¿Qué costos, comisiones y condiciones comerciales aplica?
9. ¿Cómo notifica pagos aprobados, rechazados y pendientes?
10. ¿Dispone de webhooks y consultas de estado?
11. ¿Permite reembolsos y cómo se ejecutan?
12. ¿Cómo entrega información de liquidaciones y conciliación?
13. ¿Qué condiciones exige para publicar la app y operar en producción?

## Criterio de avance

Un proveedor pasa a `Validado` solo cuando exista evidencia documental o
contractual de los puntos 1, 2, 3, 5 y 6, y un contacto comercial que confirme
el proceso de vinculación.

## Tareas relacionadas

- `PAY-001` — investigar proveedores.
- `PAY-002` — solicitar documentación, SDK y sandbox.
- `PAY-003` — confirmar dispositivos compatibles.
- `PAY-004` — validar certificaciones.
- `PAY-005` — definir modelo comercial.

# Proveedores SoftPOS

Registro de la investigación de proveedores para aceptación de pagos sin
contacto en Android, con foco en **Colombia**.

> **Estado:** sin proveedor seleccionado ni soporte confirmado.
> SumUp y Symbiotic son **nombres a investigar**, no integraciones aprobadas.

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

| Proveedor | SoftPOS en Colombia | SDK para apps de terceros | Sandbox | Documentación | Estado |
| --- | --- | --- | --- | --- | --- |
| SumUp | Por verificar | Por verificar | Por verificar | Por verificar | Sin evaluar |
| Symbiotic | Por verificar | Por verificar | Por verificar | Por verificar | Sin evaluar |

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

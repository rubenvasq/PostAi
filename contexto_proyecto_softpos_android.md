# Contexto del proyecto: Plataforma POS + SoftPOS para Android

> Documento de contexto para continuar el diseño y desarrollo del
> proyecto con herramientas como Claude Code y OpenCode.
>
> **Estado:** planificación y definición inicial. No se ha creado
> todavía el repositorio ni se ha implementado el producto. **Alcance
> vigente:** Android únicamente para el MVP. iOS queda fuera del
> desarrollo actual.

------------------------------------------------------------------------

## 1. Visión del producto

Construir una plataforma de punto de venta (POS) para comercios, que
permita convertir un teléfono Android compatible en un terminal de
aceptación de pagos sin contacto mediante tecnología **SoftPOS**.

La solución debe combinar:

1.  **Aplicación Android para comercios:** ventas, cobros, productos,
    clientes, empleados, inventario y caja.
2.  **Backend/API centralizado:** lógica de negocio, autenticación,
    persistencia, transacciones y comunicación con proveedores de pago.
3.  **Panel web administrativo:** administración del comercio,
    indicadores, reportes y configuración.

El objetivo es ofrecer una herramienta comercial integral, no solamente
una aplicación que cobre con NFC. Debe ayudar al comercio a administrar
sus operaciones diarias.

### Principio fundamental sobre los pagos

No se debe asumir que basta con usar el NFC genérico del teléfono para
aceptar tarjetas bancarias. La aceptación de pagos presenciales debe
integrarse mediante un **proveedor SoftPOS autorizado y su SDK
certificado**, cumpliendo sus requisitos técnicos, comerciales y de
seguridad.

No se debe almacenar información sensible de tarjetas, PIN, CVV ni
credenciales de pago.

------------------------------------------------------------------------

## 2. Alcance de plataforma

### MVP

-   Aplicación Android.
-   Backend/API.
-   Panel web administrativo.
-   Integración con un proveedor SoftPOS para Android, una vez validada
    su disponibilidad y documentación para Colombia.

### Fuera del alcance actual

-   Desarrollo de aplicación iOS.
-   Integración nativa con Swift.
-   Publicación o certificación para iOS.

Se puede mantener una arquitectura desacoplada que facilite una futura
expansión a iOS, pero no se debe invertir tiempo en implementarla
durante el MVP Android.

------------------------------------------------------------------------

## 3. Decisión tecnológica pendiente

Hay dos alternativas posibles. **No se deben mezclar sin tomar una
decisión explícita antes de iniciar el desarrollo.**

### Opción A: React Native + Expo + módulo nativo Kotlin

Recomendada si se prioriza velocidad de desarrollo y se quiere
aprovechar la experiencia existente con React Native y Expo.

-   React Native + Expo + TypeScript para la interfaz móvil.
-   Expo Router para navegación.
-   Kotlin mediante Expo Modules API para integrar el SDK SoftPOS cuando
    el proveedor lo requiera.
-   TanStack Query para datos remotos.
-   Zustand para estado local.
-   React Hook Form + Zod para formularios y validaciones.
-   NativeWind o una solución de estilos equivalente, si se desea
    mantener Tailwind.

**Ventajas:** desarrollo rápido de pantallas y lógica comercial;
familiaridad con el stack; posibilidad de compartir parte de la interfaz
en una futura aplicación iOS.

**Riesgos:** el módulo nativo y la integración del SDK de pagos deben
diseñarse y probarse cuidadosamente; algunas bibliotecas o SDK pueden
requerir configuración nativa específica y limitar el uso de Expo Go.

### Opción B: Kotlin + Jetpack Compose

Recomendada si se prioriza integración Android nativa, control del ciclo
de vida y compatibilidad directa con el SDK SoftPOS.

-   Kotlin.
-   Jetpack Compose.
-   Android Jetpack.
-   Arquitectura por capas.
-   Coroutines y Flow.
-   Retrofit o Ktor para comunicación con API.
-   Room para persistencia local cuando sea necesaria.
-   Hilt o Koin para inyección de dependencias.

**Ventajas:** integración directa con SDK Android, mayor control nativo
y menos intermediación entre la app y el proveedor de pagos.

**Riesgos:** no se reutilizará la interfaz móvil en una futura app iOS;
puede requerir más trabajo si el equipo domina principalmente React
Native.

### Criterio para elegir

Antes de crear la estructura definitiva, investigar el SDK del proveedor
SoftPOS candidato. Si exige integración Android nativa o ofrece mejor
soporte en Kotlin, valorar seriamente la opción B. Si el SDK puede
integrarse de forma fiable mediante un módulo nativo y se prioriza la
velocidad del producto, elegir la opción A.

**La elección debe quedar documentada en
`docs/architecture/ADR-001-mobile-stack.md`.**

------------------------------------------------------------------------

## 4. Stack general propuesto

La siguiente propuesta es independiente de la elección móvil, salvo
donde se indique.

### Backend

-   Node.js.
-   Express.
-   TypeScript.
-   PostgreSQL.
-   Prisma ORM.
-   Zod para validación.
-   JWT y refresh tokens para autenticación.
-   OpenAPI para documentar la API.
-   Redis y BullMQ, opcionales, para trabajos asíncronos.
-   Webhooks para eventos del proveedor de pagos.

### Panel web

-   React.
-   Vite.
-   TypeScript.
-   Tailwind CSS.
-   shadcn/ui.
-   Recharts para gráficos.

### Infraestructura y herramientas

-   Docker y Docker Compose.
-   GitHub Actions para CI.
-   Almacenamiento compatible con S3 para archivos, imágenes y
    comprobantes cuando corresponda.
-   Sentry para monitoreo de errores.
-   Firebase Cloud Messaging para notificaciones push.
-   Vitest o Jest para pruebas.
-   Supertest para pruebas de API.
-   Maestro para pruebas E2E móviles, si resulta compatible con el stack
    elegido.

Las versiones concretas deben definirse al iniciar el repositorio y
mantenerse consistentes mediante los archivos de bloqueo
correspondientes.

------------------------------------------------------------------------

## 5. Funcionalidades del producto

### 5.1. Pagos y cobros

-   Cobro con tarjeta sin contacto mediante SoftPOS.
-   Inicio de cobro desde un importe manual o desde el carrito.
-   Registro de efectivo y transferencia como métodos alternativos.
    Estos métodos pueden registrarse sin que la plataforma procese el
    dinero.
-   Descuentos e impuestos configurables.
-   Comprobante digital.
-   Compartir comprobante, por ejemplo mediante WhatsApp o las opciones
    de compartir del sistema.
-   Historial de transacciones.
-   Estados de pago claros.
-   Reembolsos únicamente si el proveedor y el contrato habilitan esa
    operación.
-   Consulta de liquidaciones y conciliación.
-   Protección frente a cobros duplicados.

Estados propuestos:

-   `created`
-   `pending`
-   `processing`
-   `approved`
-   `rejected`
-   `cancelled`
-   `refunded`

Se pueden añadir estados adicionales si el proveedor o el flujo
operativo lo requieren. Deben documentarse las transiciones válidas.

### 5.2. Punto de venta

-   Catálogo de productos y servicios.
-   Categorías.
-   Variantes.
-   Precios.
-   Códigos de barras.
-   Búsqueda y filtros.
-   Carrito de compra.
-   Checkout.
-   Descuentos e impuestos.
-   Registro de ventas.
-   Historial de ventas.
-   Anulación o devolución según permisos y reglas de negocio.

### 5.3. Inventario

-   Existencias por producto.
-   Entradas y salidas.
-   Ajustes manuales.
-   Historial de movimientos.
-   Alertas de stock bajo.
-   Descuento automático de inventario al completar una venta, según
    configuración.
-   Registro de quién realizó cada ajuste.

El inventario avanzado puede quedar para una fase posterior si
compromete el tiempo del MVP.

### 5.4. Clientes

-   Registro de clientes.
-   Datos de contacto opcionales.
-   Asociación de clientes con ventas.
-   Historial de compras.
-   Frecuencia y valor de compra.
-   Posibilidad futura de cupones y fidelización.

El registro de un cliente no debe bloquear un cobro sencillo.

### 5.5. Empleados y permisos

Roles iniciales sugeridos:

-   Propietario.
-   Administrador.
-   Cajero.
-   Vendedor.
-   Contador.

Permisos configurables para:

-   Consultar ventas.
-   Crear ventas.
-   Realizar devoluciones.
-   Administrar productos.
-   Ajustar inventario.
-   Consultar reportes.
-   Administrar empleados.
-   Configurar el comercio.

Registrar acciones relevantes en una bitácora de auditoría.

### 5.6. Caja y finanzas

-   Apertura y cierre de caja.
-   Registro de efectivo inicial.
-   Registro de gastos.
-   Ventas por método de pago.
-   Ventas brutas.
-   Comisiones del proveedor.
-   Ventas netas.
-   Liquidaciones.
-   Diferencias de caja.
-   Reportes por periodo.
-   Exportación de información.

Es importante distinguir entre una venta registrada, un pago aprobado,
un pago liquidado y un reembolso. No son conceptos equivalentes.

### 5.7. Indicadores y diferenciadores futuros

-   Resumen diario de ventas.
-   Comparación de periodos.
-   Metas comerciales.
-   Alertas de stock bajo.
-   Ventas por empleado.
-   Productos más vendidos.
-   Cierre de caja asistido.
-   Modo vendedor.
-   Modo de cobro rápido.
-   Lectura de códigos de barras.
-   Multi-sucursal.
-   Fidelización.
-   Asistente comercial con IA, una vez que existan datos confiables y
    permisos adecuados.

Estas capacidades no deben retrasar el flujo principal de venta y cobro.

------------------------------------------------------------------------

## 6. Alcance recomendado del MVP

El MVP debe demostrar que un comercio puede operar un flujo completo y
confiable.

### Incluido en el MVP

1.  Registro e inicio de sesión.
2.  Creación y configuración básica del comercio.
3.  Productos y servicios.
4.  Categorías.
5.  Carrito y checkout.
6.  Registro de ventas.
7.  Registro de pagos en efectivo y transferencia.
8.  Integración SoftPOS Android, cuando exista proveedor validado y
    acceso al SDK.
9.  Historial de ventas y pagos.
10. Comprobantes.
11. Clientes básicos.
12. Inventario básico.
13. Empleados y permisos básicos.
14. Dashboard con indicadores esenciales.
15. Panel web administrativo básico.
16. Auditoría de operaciones relevantes.

### Puede quedar para después

-   Fidelización avanzada.
-   IA generativa.
-   Analítica avanzada.
-   Multi-sucursal compleja.
-   Inventario con compras y proveedores.
-   Automatizaciones comerciales sofisticadas.
-   Integraciones contables externas.

### Entrega incremental sugerida

Primero construir una versión funcional que permita registrar productos,
crear ventas y registrar métodos de pago de prueba. Después integrar el
proveedor SoftPOS real. La interfaz debe diferenciar claramente los
pagos simulados de los pagos reales.

------------------------------------------------------------------------

## 7. Arquitectura de pagos

La integración debe estar desacoplada del resto del sistema.

### Contrato interno

Crear una abstracción `PaymentProvider` con operaciones definidas a
partir de las capacidades reales del proveedor seleccionado. Como
concepto, puede contemplar:

-   Inicializar o configurar el proveedor.
-   Consultar disponibilidad y compatibilidad del dispositivo.
-   Iniciar un pago.
-   Consultar el estado de una operación.
-   Procesar una cancelación cuando esté permitida.
-   Solicitar un reembolso cuando esté soportado.

No inventar nombres de clases, métodos, parámetros ni respuestas del
SDK. El contrato interno debe adaptarse a la documentación real.

### Reglas obligatorias

1.  El backend es la fuente de verdad de la transacción.
2.  El móvil no debe marcar por sí solo un pago como aprobado.
3.  Verificar el resultado con el proveedor mediante el mecanismo
    documentado.
4.  Implementar claves de idempotencia para evitar cobros duplicados.
5.  Validar autenticidad de webhooks.
6.  Guardar referencias del proveedor y trazabilidad de intentos.
7.  Separar sandbox y producción.
8.  Registrar errores sin exponer información sensible.
9.  No guardar PAN, CVV, PIN ni credenciales sensibles.
10. No asumir que todos los dispositivos Android con NFC son
    compatibles.

### Modelo conceptual

Entidades posibles:

-   `Payment`
-   `PaymentAttempt`
-   `PaymentProvider`
-   `ProviderWebhookEvent`
-   `Refund`
-   `Settlement`
-   `PaymentMethod`

La estructura final debe derivarse del proveedor, las necesidades de
conciliación y el modelo de negocio.

------------------------------------------------------------------------

## 8. Investigación obligatoria de proveedores SoftPOS

No hay proveedor seleccionado ni disponibilidad confirmada. Se
mencionaron SumUp y Symbiotic como nombres para investigar, no como
integraciones aprobadas ni como garantía de soporte en Colombia.

Antes de implementar, validar para cada candidato:

1.  ¿Ofrece SoftPOS para comercios en Colombia?
2.  ¿Permite integrar su SDK en una aplicación Android de terceros?
3.  ¿Qué versiones de Android y dispositivos admite?
4.  ¿Qué requisitos de NFC, hardware y seguridad exige?
5.  ¿Qué certificaciones y controles de seguridad aplica, incluyendo PCI
    MPoC cuando corresponda?
6.  ¿Ofrece documentación técnica y un entorno sandbox?
7.  ¿Cómo funciona el onboarding y la vinculación del comercio?
8.  ¿Qué costos, comisiones y condiciones comerciales aplica?
9.  ¿Cómo notifica pagos aprobados, rechazados y pendientes?
10. ¿Dispone de webhooks y consultas de estado?
11. ¿Permite reembolsos y cómo se ejecutan?
12. ¿Cómo entrega información de liquidaciones y conciliación?
13. ¿Qué condiciones exige para publicar la aplicación y operar en
    producción?

No avanzar con una integración real hasta confirmar el soporte para
Colombia, el acceso al SDK y las condiciones comerciales.

------------------------------------------------------------------------

## 9. Plan de desarrollo por etapas

### Etapa 0. Investigación y arquitectura

-   Definir el modelo de negocio.
-   Investigar proveedores SoftPOS.
-   Confirmar soporte para Colombia y Android.
-   Obtener documentación, SDK y sandbox.
-   Revisar requisitos de dispositivos y certificación.
-   Elegir stack móvil.
-   Definir arquitectura general.
-   Diseñar modelo de datos.
-   Definir contratos API.
-   Documentar decisiones técnicas.

**Resultado:** arquitectura validada y decisión de proveedor/stack
documentada.

### Etapa 1. Fundación del proyecto

-   Crear repositorio y estructura.
-   Configurar backend.
-   Configurar aplicación Android.
-   Configurar panel web.
-   Configurar PostgreSQL y Prisma.
-   Configurar Docker Compose.
-   Configurar variables de entorno.
-   Configurar linting, formato y pruebas.
-   Configurar GitHub Actions.

**Resultado:** todos los componentes arrancan en entorno local y pueden
comunicarse.

### Etapa 2. UX/UI

Diseñar y construir:

-   Onboarding.
-   Login.
-   Dashboard.
-   Pantalla de cobro.
-   Catálogo.
-   Carrito.
-   Checkout.
-   Historial.
-   Detalle de venta.
-   Clientes.
-   Inventario.
-   Empleados.
-   Configuración.

Definir estados de carga, vacío, error, éxito, sin conexión y permisos
insuficientes.

### Etapa 3. Backend comercial

Implementar:

-   Comercios.
-   Sucursales, si se incluyen desde el inicio.
-   Usuarios y roles.
-   Productos y categorías.
-   Clientes.
-   Inventario.
-   Ventas.
-   Pagos.
-   Auditoría.
-   Reportes básicos.

Definir validaciones, permisos, paginación, filtros y documentación API.

### Etapa 4. Aplicación POS Android

-   Autenticación.
-   Selección o contexto del comercio.
-   Catálogo.
-   Búsqueda.
-   Carrito.
-   Checkout.
-   Registro de efectivo y transferencia.
-   Historial.
-   Comprobantes.
-   Inventario básico.
-   Dashboard.

### Etapa 5. Integración SoftPOS

-   Crear módulo de integración según el stack elegido.
-   Configurar SDK oficial.
-   Comprobar compatibilidad del dispositivo.
-   Implementar activación y vinculación.
-   Iniciar transacciones.
-   Gestionar estados y errores.
-   Verificar resultados desde backend/proveedor.
-   Recibir y procesar webhooks.
-   Implementar idempotencia.
-   Implementar conciliación y reembolsos si están soportados.
-   Probar en dispositivos físicos autorizados.

### Etapa 6. Funcionalidades complementarias

-   Empleados y permisos ampliados.
-   Cierre de caja.
-   Gastos.
-   Alertas.
-   Metas.
-   Reportes ampliados.
-   Exportaciones.
-   Fidelización.
-   Multi-sucursal.
-   Asistente comercial, si procede.

### Etapa 7. Calidad y seguridad

-   Pruebas unitarias.
-   Pruebas de integración.
-   Pruebas E2E.
-   Pruebas en dispositivos físicos.
-   Pruebas con mala conectividad.
-   Prevención de transacciones duplicadas.
-   Pruebas de permisos.
-   Revisión de privacidad.
-   Revisión de logs y secretos.
-   Pruebas de conciliación.
-   Revisión de requisitos del proveedor y certificaciones.

### Etapa 8. Piloto y lanzamiento

-   Seleccionar comercios piloto.
-   Capacitar usuarios.
-   Medir errores y tiempos de operación.
-   Revisar conciliación real.
-   Corregir problemas.
-   Preparar soporte y monitoreo.
-   Cumplir requisitos de publicación y producción.

La estimación inicial de 18--24 semanas es únicamente orientativa. El
plazo real depende especialmente de la selección del proveedor, el
acceso al SDK, los procesos de certificación y el alcance final del MVP.

------------------------------------------------------------------------

## 10. Estructura propuesta del repositorio

La estructura debe ajustarse según la decisión móvil.

``` text
softpos-platform/
├── apps/
│   ├── mobile/                 # Android: React Native/Expo o Kotlin nativo
│   ├── api/                    # Backend Express + TypeScript
│   └── admin/                  # Panel React + Vite
├── packages/
│   ├── shared/
│   ├── validation/
│   ├── types/
│   ├── payment-contracts/
│   └── design-system/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── security/
│   ├── providers/
│   └── development/
├── PROJECT_CONTEXT.md
├── AGENTS.md
├── TASKS.md
├── CHANGELOG.md
├── docker-compose.yml
└── README.md
```

Si se elige Kotlin nativo, `apps/mobile` será un proyecto
Gradle/Android. Si se elige React Native + Expo, se mantendrá el
proyecto Expo y el módulo Kotlin se integrará como módulo nativo.

No crear paquetes compartidos innecesarios antes de que exista una
necesidad concreta.

------------------------------------------------------------------------

## 11. Organización del trabajo con Claude Code y OpenCode

La intención es dividir responsabilidades para avanzar con orden y
reducir consumo de tokens.

### Claude Code: arquitecto y revisor

Responsabilidades:

-   Analizar requisitos.
-   Diseñar arquitectura.
-   Definir modelos de datos.
-   Definir contratos API.
-   Diseñar flujos de pagos.
-   Revisar seguridad.
-   Evaluar documentación de proveedores.
-   Revisar decisiones técnicas.
-   Auditar cambios de OpenCode.
-   Detectar inconsistencias y deuda técnica.

Claude Code no debe inventar métodos del SDK ni implementar
integraciones basadas en documentación inexistente.

### OpenCode: implementador

Responsabilidades:

-   Crear estructura inicial.
-   Implementar pantallas.
-   Construir componentes.
-   Implementar CRUD.
-   Crear endpoints siguiendo contratos aprobados.
-   Implementar formularios y validaciones.
-   Construir dashboard.
-   Implementar catálogo, clientes e inventario.
-   Añadir pruebas.
-   Corregir errores.
-   Actualizar documentación de cambios.

OpenCode debe respetar las decisiones y contratos definidos por el
arquitecto.

### Reglas para trabajar con ambos agentes

1.  No permitir que ambos editen simultáneamente los mismos archivos.
2.  Trabajar con ramas separadas.
3.  Dividir el trabajo en tareas pequeñas y verificables.
4.  Definir criterios de aceptación antes de implementar.
5.  Claude define/revisa; OpenCode implementa.
6.  No aceptar cambios que inventen endpoints o métodos de SDK.
7.  Ejecutar pruebas antes de integrar.
8.  Documentar decisiones importantes.
9.  Mantener `TASKS.md` como fuente de verdad del progreso.
10. Revisar cada PR antes de fusionar.

------------------------------------------------------------------------

## 12. Organización para ahorrar tokens

Mantener archivos de contexto breves y actualizados:

-   `PROJECT_CONTEXT.md`: objetivo, alcance, stack y reglas del
    proyecto.
-   `AGENTS.md`: instrucciones para agentes y convenciones.
-   `TASKS.md`: tareas pendientes, en curso y terminadas.
-   `CHANGELOG.md`: cambios relevantes.
-   `docs/architecture/`: decisiones técnicas.
-   `docs/providers/`: documentación y notas verificadas del proveedor.

Buenas prácticas:

-   Enviar prompts concretos y limitados a una tarea.
-   Evitar pedir que el agente vuelva a leer todo el repositorio si no
    hace falta.
-   Indicar rutas exactas de archivos relevantes.
-   Pedir un resumen de cambios y pruebas ejecutadas.
-   No repetir investigaciones de proveedores.
-   Mantener una única fuente de verdad para requisitos y tareas.
-   No solicitar implementación antes de aprobar contratos y decisiones
    críticas.

------------------------------------------------------------------------

## 13. Requisitos no funcionales

### Seguridad

-   Autenticación segura.
-   Autorización basada en roles y permisos.
-   Gestión segura de tokens.
-   Secretos fuera del repositorio.
-   Validación de entradas.
-   Rate limiting donde corresponda.
-   Auditoría de acciones relevantes.
-   Protección de webhooks.
-   No almacenar datos sensibles de tarjetas.
-   Cifrado en tránsito.
-   Política de manejo y retención de datos.

### Confiabilidad

-   Idempotencia en operaciones críticas.
-   Manejo explícito de estados de pago.
-   Reintentos controlados.
-   Trazabilidad de transacciones.
-   Conciliación con el proveedor.
-   Manejo de conectividad intermitente.
-   No asumir que una respuesta del dispositivo equivale a liquidación.

### Experiencia de usuario

-   Flujo de cobro rápido.
-   Interfaz clara para personal no técnico.
-   Mensajes de error accionables.
-   Confirmación visible del resultado.
-   Diferenciación entre pagos reales y simulados.
-   Diseño adaptable a distintos tamaños de pantalla Android.

### Mantenibilidad

-   TypeScript estricto en los componentes TypeScript.
-   Separación por dominios.
-   Contratos documentados.
-   Pruebas automatizadas.
-   Convenciones de código.
-   Decisiones técnicas registradas.

------------------------------------------------------------------------

## 14. Riesgos y decisiones pendientes

  -----------------------------------------------------------------------
  Tema                    Estado                  Acción necesaria
  ----------------------- ----------------------- -----------------------
  Plataforma MVP          Definido                Android únicamente

  Stack móvil             Pendiente               Elegir React Native +
                                                  Expo + Kotlin o
                                                  Kotlin + Compose

  Proveedor SoftPOS       Pendiente               Investigar y validar
                                                  Colombia

  Acceso al SDK           Pendiente               Solicitar documentación
                                                  y sandbox

  Compatibilidad de       Pendiente               Confirmar lista oficial
  dispositivos                                    del proveedor

  Certificaciones         Pendiente               Validar requisitos con
                                                  proveedor/adquirente

  Modelo comercial        Pendiente               Definir comisiones,
                                                  planes y liquidaciones

  Modelo de datos         Por diseñar             Definir entidades y
                                                  relaciones

  Panel web               Propuesto               React + Vite +
                                                  TypeScript

  Backend                 Propuesto               Express + TypeScript +
                                                  PostgreSQL

  Publicación             Pendiente               Definir requisitos y
                                                  proceso
  -----------------------------------------------------------------------

### Riesgo principal

El mayor riesgo del proyecto no es construir el POS, sino conseguir y
validar una integración SoftPOS que permita operar legal y técnicamente
en Colombia. La integración de pagos debe tratarse como una dependencia
crítica y validarse al inicio.

------------------------------------------------------------------------

## 15. Primeros pasos recomendados

1.  Investigar proveedores SoftPOS con operación en Colombia.
2.  Solicitar acceso a documentación, SDK y sandbox.
3.  Confirmar dispositivos Android compatibles.
4.  Elegir entre React Native + Expo + Kotlin y Kotlin + Jetpack
    Compose.
5.  Crear el documento de arquitectura y las decisiones ADR.
6.  Definir el modelo de datos y contratos API.
7.  Crear el repositorio y la estructura.
8.  Implementar primero el flujo comercial con pagos simulados.
9.  Integrar SoftPOS cuando el proveedor esté validado.
10. Probar el flujo completo con comercios piloto.

------------------------------------------------------------------------

## 16. Instrucción maestra para los agentes

Antes de implementar cualquier funcionalidad:

-   Lee `PROJECT_CONTEXT.md` y `AGENTS.md`.
-   Revisa `TASKS.md` para conocer el estado actual.
-   Respeta el alcance Android-only del MVP.
-   No implementes iOS.
-   No inventes APIs, SDK, endpoints ni capacidades del proveedor.
-   Si una decisión crítica no está definida, documenta la duda y
    solicita aprobación antes de asumir.
-   Mantén la arquitectura desacoplada, pero evita abstracciones
    prematuras.
-   Prioriza un flujo de venta confiable y verificable.
-   Distingue pagos simulados de pagos reales.
-   Ejecuta las pruebas pertinentes y reporta exactamente cuáles pasaron
    y cuáles no.
-   Resume archivos modificados, decisiones tomadas y siguientes pasos.

------------------------------------------------------------------------

## 17. Glosario breve

-   **POS:** punto de venta; sistema para registrar ventas y administrar
    operaciones comerciales.
-   **SoftPOS:** solución que permite aceptar pagos sin contacto en un
    dispositivo compatible mediante software y componentes certificados.
-   **SDK:** kit de desarrollo proporcionado por un tercero para
    integrar sus capacidades.
-   **Adquirente/proveedor de pagos:** entidad o proveedor que habilita
    el procesamiento de pagos.
-   **Webhook:** notificación enviada por un sistema externo a un
    endpoint del backend.
-   **Idempotencia:** mecanismo que evita ejecutar varias veces una
    misma operación lógica.
-   **Conciliación:** proceso de comparar ventas, pagos, comisiones y
    liquidaciones.
-   **Liquidación:** transferencia o abono de los fondos al comercio
    según las condiciones del proveedor.
-   **MPoC:** estándar de seguridad de PCI para soluciones de aceptación
    de pagos móviles, según el alcance aplicable.

------------------------------------------------------------------------

**Fin del documento.**

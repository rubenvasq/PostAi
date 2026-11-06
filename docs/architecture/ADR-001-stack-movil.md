# ADR-001 — Stack móvil del MVP

- **Estado:** Propuesto — pendiente de decisión
- **Fecha:** 2026-11-06
- **Decisores:** arquitecto + responsable del producto
- **Contexto relacionado:** `PROJECT_CONTEXT.md`, `TASKS.md` (`ARQ-001`)

## Contexto

El MVP es Android únicamente, pero debe integrar un SDK SoftPOS de un proveedor
aún no seleccionado. La elección del stack condiciona la integración, el
rendimiento, el acceso al hardware NFC y el esfuerzo de desarrollo.

No se debe iniciar el scaffolding definitivo ni mezclar ambos stacks sin una
decisión explícita.

## Alternativas consideradas

### Opción A — React Native + Expo + módulo nativo Kotlin

- React Native + Expo + TypeScript, Expo Router.
- Módulo Kotlin vía Expo Modules API para el SDK SoftPOS.
- TanStack Query, Zustand, React Hook Form + Zod, NativeWind opcional.

**Ventajas:** velocidad de desarrollo y familiaridad del equipo; posible
reutilización parcial de UI en una futura app iOS.

**Riesgos:** el módulo nativo y el SDK de pagos requieren configuración y
pruebas cuidadosas; algunas dependencias pueden limitar Expo Go y exigir builds
nativos.

### Opción B — Kotlin + Jetpack Compose

- Kotlin, Jetpack Compose, Android Jetpack, arquitectura por capas.
- Coroutines/Flow, Retrofit o Ktor, Room, Hilt o Koin.

**Ventajas:** integración directa con el SDK Android, control del ciclo de vida
y menos intermediación entre la app y el proveedor.

**Riesgos:** no se reutiliza la UI móvil para iOS; puede requerir más trabajo si
el equipo domina principalmente React Native.

## Criterio de decisión

Investigar primero el SDK del proveedor candidato:

1. Si exige integración Android nativa o tiene mejor soporte en Kotlin, valorar
   seriamente la opción B.
2. Si puede integrarse de forma fiable mediante un módulo nativo y se prioriza
   la velocidad del producto, elegir la opción A.

La decisión debe basarse en documentación oficial del proveedor, no en
suposiciones.

## Decisión

**Pendiente.** No seleccionar hasta completar `PAY-001` y `PAY-002` y revisar la
documentación real del SDK.

## Consecuencias

- `INF-001` e `INF-004` quedan pendientes hasta aceptar este ADR.
- La estructura de `apps/mobile` dependerá de la opción elegida.

## Referencias

- `contexto_proyecto_softpos_android.md`, sección 3.
- Documentación del proveedor: pendiente de obtener.

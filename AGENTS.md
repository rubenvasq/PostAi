# AGENTS.md — Instrucciones para agentes

Este archivo aplica a cualquier agente (Claude Code, OpenCode u otro) que
trabaje en el repositorio **PostAi** (`postai`), del **Equipo PostAi**. La
carpeta local `NFC` es solo la ruta de trabajo; no es el nombre del producto.

## Orden de lectura antes de trabajar

1. `PROJECT_CONTEXT.md` — alcance, stack y reglas.
2. `AGENTS.md` — este archivo.
3. `TASKS.md` — estado actual y tarea asignada.
4. El ADR o documento de `docs/` relacionado con la tarea.

No es necesario releer todo el repositorio si la tarea está acotada.

## Roles

### Claude Code — arquitecto y revisor

- Analiza requisitos y diseña arquitectura.
- Define modelos de datos y contratos API.
- Diseña flujos de pago y revisa seguridad.
- Evalúa documentación de proveedores.
- Audita cambios de OpenCode y detecta deuda técnica.
- **No** inventa métodos de SDK ni implementa integraciones sin documentación.

### OpenCode — implementador

- Crea estructura y pantallas.
- Implementa CRUD, endpoints, formularios y dashboard.
- Añade pruebas y corrige errores.
- Actualiza documentación de cambios.
- **Respeta** las decisiones y contratos definidos por el arquitecto.

## Reglas de trabajo

1. Un solo agente edita un archivo a la vez.
2. Trabajar en ramas separadas por tarea.
3. Dividir el trabajo en tareas pequeñas y verificables.
4. Definir criterios de aceptación **antes** de implementar.
5. Claude define/revisa; OpenCode implementa.
6. No aceptar cambios que inventen endpoints, SDK o capacidades del proveedor.
7. Ejecutar pruebas antes de integrar.
8. Documentar decisiones importantes en un ADR.
9. Mantener `TASKS.md` como fuente de verdad del progreso.
10. Revisar cada PR antes de fusionar.

## Reglas específicas del dominio

- **Android only.** No implementar iOS, Swift ni publicación en App Store.
- **Backend = fuente de verdad** de ventas y pagos.
- **No** marcar pagos como aprobados desde el móvil.
- **No** almacenar PAN, CVV, PIN ni credenciales sensibles.
- **No** usar NFC genérico para cobrar tarjetas.
- **No** asumir compatibilidad de dispositivos: consultar la lista oficial.
- **No** avanzar con integración real hasta validar proveedor, SDK, sandbox y
  condiciones para Colombia.
- Distinguir pagos **simulados** de **reales** en UI, datos y logs.
- Toda operación crítica de pago debe ser **idempotente**.

## Convenciones de código

- TypeScript en modo estricto en todo componente TypeScript.
- Separación por dominios; evitar abstracciones prematuras.
- Nombres de API y base de datos en inglés; UI y documentación en español.
- Validación de entradas con Zod en el backend.
- Secretos fuera del repositorio; usar variables de entorno y `.env.example`.
- Commits en formato Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Formato y lint se definirán al crear el scaffolding; no introducir reglas
  nuevas sin documentarlas.

## Flujo de una tarea

1. Tomar una tarea de `TASKS.md` y marcarla `En curso`.
2. Escribir criterios de aceptación verificables.
3. Implementar el cambio mínimo que los cumple.
4. Ejecutar lint, typecheck y pruebas pertinentes.
5. Reportar archivos modificados, decisiones y resultado exacto de las pruebas.
6. Actualizar `TASKS.md` y `CHANGELOG.md`.
7. Si apareció una decisión crítica, crear/actualizar un ADR.

## Definición de terminado (DoD)

- Criterios de aceptación cumplidos.
- Lint y typecheck sin errores.
- Pruebas relevantes ejecutadas y reportadas.
- Sin secretos, datos sensibles ni endpoints inventados.
- Documentación y `TASKS.md` actualizados.
- Cambio revisado por el arquitecto cuando aplique.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | API y panel web en modo desarrollo |
| `npm run dev:api` | API en `http://127.0.0.1:3000` |
| `npm run dev:admin` | Panel en `http://127.0.0.1:5173` |
| `npm run build` | Compila API y panel |
| `npm run typecheck` | Verificación de TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier sobre el código |
| `npm run format:check` | Verifica el formato sin modificar |
| `npm test` | Pruebas de la API |
| `npm run db:up` | PostgreSQL local con Docker |
| `npm run db:generate` | Genera Prisma Client |
| `npm run db:migrate` | Migraciones de Prisma |
| `npm run db:studio` | Prisma Studio |
| `npm run db:down` | Detiene los contenedores |

El CI de `.github/workflows/ci.yml` ejecuta formato, lint, typecheck, pruebas y
build en cada `push` a `main`, en cada pull request y de forma manual. Ver
[`docs/development/README.md`](docs/development/README.md).

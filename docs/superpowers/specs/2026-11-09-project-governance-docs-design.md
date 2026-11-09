# Diseño: Documentación de gobernanza del proyecto SmashZone

**Fecha:** 2026-11-09
**Estado:** Aprobado

## Contexto

SmashZone (Rage Room Management System) es un proyecto grupal de 4 integrantes
para la asignatura DAEA (TECSUP), presentación semana 16. Antes de escribir
código se necesita dejar reglas claras para los integrantes y sus asistentes
de IA, de forma que todos trabajen con el mismo contrato de arquitectura,
convenciones y flujo de git.

## Decisiones

- **Stack:** Backend .NET 10 Web API + EF Core 10 + AutoMapper + JWT.
  Frontend: React + TypeScript (Vite). SQL Server para desarrollo local vía
  Docker Compose (misma imagen para los 4 integrantes).
- **Repositorio:** Monorepo — `Backend/`, `Frontend/`, `docs/` en el mismo repo.
- **División de trabajo:** 4 bloques por dominio, full-stack cada uno:
  1. Auth + Usuarios
  2. Catálogo (Salas + Paquetes + Inventario)
  3. Core transaccional (Reservas + Pagos)
  4. Reportes + Dashboard + Frontend shell/infra
- **Git workflow:** `main` protegido + feature branches
  (`feature/<bloque>-<descripcion>`) + PR obligatorio con al menos 1 review
  de otro integrante antes de merge.
- **Deploy:** no decidido aún. La documentación deja la sección genérica
  (Azure App Service / Railway / Render, todas compatibles con el spec).

## Estructura de documentación (approach "hub-and-spoke")

- `AGENTS.md` (raíz): única fuente de verdad de reglas para IAs — convenciones
  de código, capas backend, DTOs/AutoMapper, validación, auth JWT, git
  workflow, límites de los 4 bloques, qué NO hacer.
- `CLAUDE.md` (raíz): corto, remite a `AGENTS.md`, agrega solo extras
  específicos de Claude Code (skills a usar, TDD, formato de commits).
- `README.md` (raíz): overview humano — qué es el proyecto, stack, estructura
  de carpetas, cómo levantar entorno local, enlaces a `docs/` y a los 4
  bloques con responsables.
- `docs/`: specs detalladas —
  `docs/arquitectura.md`, `docs/base-de-datos.md`, `docs/api-contracts.md`,
  `docs/git-workflow.md`, `docs/deploy.md` (placeholder),
  `docs/modulos/bloque-1-auth.md` … `bloque-4-reportes.md`.

## Por qué hub-and-spoke (vs. 3 archivos autocontenidos)

Con 4 personas y sus respectivas IAs editando en paralelo, duplicar reglas en
3 archivos (`AGENTS.md`, `CLAUDE.md`, `README.md`) generaría divergencia
cuando alguien actualice una copia y olvide la otra. Una sola fuente de
verdad (`AGENTS.md`) con los otros dos como "vista" reduce ese riesgo.

## Fuera de alcance

- Código de ninguna capa (ya se inicializó `Frontend/` con Vite+React+TS
  como acción explícita separada, no parte de este diseño).
- Decisión final de plataforma de deploy.
- Diseño detallado de endpoints/contratos — eso vive en `docs/api-contracts.md`
  como documento vivo, se llena a medida que cada bloque avanza.

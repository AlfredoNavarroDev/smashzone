# CLAUDE.md — SmashZone

Las reglas completas del proyecto viven en [`AGENTS.md`](./AGENTS.md).
Léelo primero — este archivo solo agrega lo específico de Claude Code.

## Flujo de trabajo esperado

- Antes de implementar cualquier feature o fix, sigue
  `superpowers:test-driven-development`: escribe el test que falla antes
  de escribir el código de producción.
- Si algo no se comporta como se espera, usa
  `superpowers:systematic-debugging` antes de proponer un fix.
- Para cambios grandes (nuevo módulo, endpoint nuevo con varias piezas),
  usa `superpowers:brainstorming` antes de tocar código, igual que se usó
  para generar esta documentación.
- Antes de dar por terminada una tarea, usa
  `superpowers:requesting-code-review` o pide review a un compañero.

## Commits

Conventional Commits, mensaje corto describiendo el *por qué*, no el *qué*
(el diff ya muestra el qué). Nunca mezclar cambios de dos bloques distintos
en un mismo commit.

## Límites

- No hagas merge a `main` tú solo. Deja el PR abierto para review humano.
- No asumas decisiones de arquitectura no escritas en `AGENTS.md` o
  `docs/` — si falta una decisión, pregunta antes de improvisar.

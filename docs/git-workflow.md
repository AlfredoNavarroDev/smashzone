# Git workflow

## Ramas

- `main` — protegida, siempre desplegable. Nadie commitea directo acá.
- `feature/<bloque>-<descripcion-corta>` — una por tarea.
  Ejemplos: `feature/auth-jwt-login`, `feature/reservas-prevenir-solapamiento`,
  `feature/dashboard-grafico-ingresos`.

## Flujo por tarea

1. `git checkout main && git pull`
2. `git checkout -b feature/<bloque>-<descripcion>`
3. Trabajar, commitear seguido con mensajes claros (ver convención abajo).
4. `git push -u origin feature/<bloque>-<descripcion>`
5. Abrir Pull Request hacia `main`.
6. **Mínimo 1 review de otro integrante** antes de merge.
7. Merge a `main` (preferir "Squash and merge" para mantener el historial
   de `main` limpio).
8. Borrar la rama feature tras el merge.

## Mensajes de commit (Conventional Commits)

```
<tipo>: <descripción corta en presente>

[cuerpo opcional explicando el por qué, no el qué]
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Ejemplos:
- `feat: agrega validacion de solapamiento de horarios en reservas`
- `fix: corrige calculo de monto total con extras`
- `docs: agrega contrato de endpoint de pagos`

## Pull Requests

- Título corto, describe el cambio.
- Descripción: qué hace, por qué, cómo probarlo.
- Si toca DB, mencionar la migración agregada.
- El reviewer verifica: ¿sigue la arquitectura de capas de `AGENTS.md`?
  ¿tiene DTOs en vez de entidades expuestas? ¿rompe algo de otro bloque?

## Conflictos entre bloques

Si dos bloques necesitan tocar la misma tabla/entidad (ej. bloque 3 lee
`Salas` del bloque 2), coordinar primero el contrato del DTO en
`docs/api-contracts.md` antes de implementar, para no bloquearse mutuamente.

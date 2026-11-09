# AGENTS.md — SmashZone

Esta es la **única fuente de verdad** para cualquier asistente de IA
(Claude, Copilot, Cursor, Gemini, etc.) y para cualquier integrante del
equipo que trabaje en este repositorio. Si otro archivo (`CLAUDE.md`,
`README.md`) dice algo distinto a este, este archivo manda.

## 1. Qué es el proyecto

SmashZone es una plataforma de gestión de un Rage Room (salas de
destrucción): reservas, catálogo de salas/paquetes, inventario de objetos
destruibles, pago simulado y reportes. Ver especificación completa en
`docs/Rage Room Management Platform Specification.md`.

## 2. Stack técnico (fijo, no renegociable sin acuerdo del equipo)

| Capa | Tecnología |
|---|---|
| Backend | .NET 10 Web API |
| ORM | Entity Framework Core 10 |
| Mapeo DTO ↔ Entidad | AutoMapper |
| Validación | DataAnnotations + FluentValidation |
| Auth | JWT (Bearer tokens) |
| Base de datos | SQL Server (Docker local, cloud en producción) |
| Frontend | React + TypeScript (Vite) |

No introducir otro framework de frontend, otro ORM, ni otro mecanismo de
auth sin discutirlo con el equipo primero.

## 3. Estructura del repositorio (monorepo)

```
Proyecto/
├── Backend/          → solución .NET 10 (API)
├── Frontend/         → app React + TypeScript (Vite)
├── docs/             → toda la documentación detallada
├── AGENTS.md         → este archivo
├── CLAUDE.md         → extras específicos para Claude Code
└── README.md         → overview para humanos
```

## 4. Arquitectura del Backend (obligatoria)

Cada endpoint sigue este flujo de capas, sin excepciones:

```
Controller → Service (lógica de negocio) → Data/Repository (EF Core) → SQL Server
```

- **Controllers**: solo reciben el request, validan DTO de entrada, llaman
  al Service, devuelven el DTO de salida. Nunca contienen lógica de negocio
  ni acceden a `DbContext` directamente.
- **Services**: contienen la lógica de negocio (ej. validar solapamiento de
  horarios, verificar stock). Usan AutoMapper para convertir entre
  Entidad ↔ DTO.
- **DTOs**: todo endpoint recibe y devuelve DTOs, nunca entidades de EF Core
  directamente. Nombrar como `CrearReservaDTO`, `ReservaDetalleDTO`, etc.
  (ver convención exacta en la especificación del proyecto).
- **Validación**: DataAnnotations para reglas simples (`[Required]`,
  `[Range]`), FluentValidation para reglas compuestas (ej. fecha fin >
  fecha inicio, stock disponible).
- **Autorización por rol**: usar `[Authorize(Roles = "Admin,Staff")]` según
  la tabla de roles de `docs/Rage Room Management Platform Specification.md`.

## 5. División de trabajo (4 bloques)

El equipo son 4 integrantes. Cada uno lidera un bloque **full-stack**
(Backend + Frontend de su propio dominio):

| Bloque | Dominio | Incluye |
|---|---|---|
| 1 | Auth + Usuarios | Registro, login, JWT, roles, perfil |
| 2 | Catálogo | Salas, Paquetes, Inventario de ítems |
| 3 | Core transaccional | Reservas, prevención de solapamiento, Pagos simulados |
| 4 | Reportes + Shell | Dashboard, gráficos, estructura base del Frontend (routing, layout, auth guard) |

Detalle de cada bloque en `docs/modulos/`. Antes de modificar código de un
bloque que no es el tuyo, avisa al responsable o abre un PR separado.

## 6. Git workflow

- `main` es la rama protegida. Nunca commitear directo a `main`.
- Una rama por tarea: `feature/<bloque>-<descripcion-corta>`
  (ej. `feature/reservas-prevenir-solapamiento`).
- Todo cambio entra por Pull Request. **Mínimo 1 review** de otro
  integrante antes de merge.
- Mensajes de commit en formato Conventional Commits
  (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- Detalle completo en `docs/git-workflow.md`.

## 7. Qué NO hacer

- No mergear a `main` sin PR y sin review.
- No hardcodear secrets (JWT secret, connection strings) en código fuente —
  usar `appsettings.Development.json` (ignorado en git) o variables de
  entorno.
- No acceder a `DbContext` desde un Controller.
- No devolver entidades de EF Core directo en una respuesta HTTP — siempre
  DTO.
- No tocar el bloque de otro integrante sin coordinar.
- No agregar librerías/frameworks nuevos sin acuerdo del equipo.

## 8. Dónde buscar más detalle

- Arquitectura completa: `docs/arquitectura.md`
- Modelo de base de datos: `docs/base-de-datos.md`
- Contratos de API (DTOs de request/response por endpoint): `docs/api-contracts.md`
- Flujo de git paso a paso: `docs/git-workflow.md`
- Plan de despliegue: `docs/deploy.md`
- Detalle de cada bloque: `docs/modulos/bloque-1-auth.md` … `bloque-4-reportes.md`

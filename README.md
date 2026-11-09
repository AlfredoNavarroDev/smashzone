# 📦 SmashZone — Rage Room Management System

Plataforma web para la gestión operativa y comercial de un negocio de
**Rage Room** (salas de destrucción). Los clientes reservan salas, eligen
paquetes de destrucción e ítems extra; el staff/admin gestiona
disponibilidad, inventario y control de sesiones en tiempo real.

Proyecto del curso **Desarrollo de Aplicaciones Web** (DAEA, TECSUP) —
presentación final semana 16 (2 de diciembre, 2026).

> Especificación funcional completa:
> [`docs/Rage Room Management Platform Specification.md`](./docs/Rage%20Room%20Management%20Platform%20Specification.md)

## Stack

- **Backend:** .NET 10 Web API + EF Core 10 + AutoMapper + JWT
- **Frontend:** React + TypeScript (Vite)
- **Base de datos:** SQL Server (Docker en local, cloud en producción)

## Estructura del repositorio

```
Proyecto/
├── Backend/          → API .NET 10 (Controllers, Services, Data/EF Core)
├── Frontend/          → SPA React + TypeScript (Vite)
├── docs/              → documentación detallada del proyecto
│   ├── arquitectura.md
│   ├── base-de-datos.md
│   ├── api-contracts.md
│   ├── git-workflow.md
│   ├── deploy.md
│   └── modulos/
│       ├── bloque-1-auth.md
│       ├── bloque-2-catalogo.md
│       ├── bloque-3-core-transaccional.md
│       └── bloque-4-reportes.md
├── AGENTS.md          → reglas para asistentes de IA (fuente única de verdad)
├── CLAUDE.md          → extras específicos para Claude Code
└── README.md          → este archivo
```

## Equipo y división de trabajo

4 integrantes, cada uno lidera un bloque full-stack (Backend + Frontend de
su propio dominio):

| Bloque | Dominio |
|---|---|
| 1 | Auth + Usuarios |
| 2 | Catálogo (Salas, Paquetes, Inventario) |
| 3 | Core transaccional (Reservas, Pagos simulados) |
| 4 | Reportes + Dashboard + Frontend shell |

Detalle de cada bloque en `docs/modulos/`.

## Cómo levantar el entorno local

1. **Base de datos** — SQL Server vía Docker (ver `docs/base-de-datos.md`
   para el `docker-compose.yml` exacto).
2. **Backend:**
   ```bash
   cd Backend
   dotnet restore
   dotnet run --project Backend
   ```
3. **Frontend:**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

## Git workflow (resumen)

`main` protegido → rama `feature/<bloque>-<descripcion>` → Pull Request →
mínimo 1 review → merge. Detalle completo en `docs/git-workflow.md`.

## Para asistentes de IA

Si vas a trabajar en este repo con un asistente de IA (Claude, Copilot,
Cursor, etc.), lee primero [`AGENTS.md`](./AGENTS.md).

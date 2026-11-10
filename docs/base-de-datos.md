# Base de datos

Motor: **SQL Server**. Acceso: **EF Core 10**, **DB First**.

`script.sql` es la **única fuente de verdad del schema**. Nunca se edita
el schema desde migraciones EF ni desde el código — todo cambio de tabla,
columna, constraint o índice se hace primero en `script.sql`, y luego se
regenera el modelo EF Core con `Scaffold-DbContext` (o
`dotnet ef dbcontext scaffold`).

> Decisión tomada 2026-11-09, reemplaza el Code First original de este
> documento. Motivo: equipo prefiere controlar el schema SQL directamente
> vía `script.sql` en vez de dejar que EF Core lo derive de las entidades.

## Entidades (ver schema SQL completo en el spec funcional)

El schema conceptual completo (tablas, columnas, FKs) está en
[`Rage Room Management Platform Specification.md`](./Rage%20Room%20Management%20Platform%20Specification.md#-modelo-de-base-de-datos-e-r).
Resumen de entidades y quién las "owns" por bloque:

| Entidad | Bloque dueño |
|---|---|
| Roles, Usuarios | 1 — Auth |
| Salas, Paquetes, ItemsInventario | 2 — Catálogo |
| Reservas, DetalleReservaExtras, Pagos | 3 — Core transaccional |
| (lectura agregada de todas) | 4 — Reportes |

Un bloque puede necesitar leer entidades de otro bloque (ej. Reservas lee
Salas y Paquetes) — eso está permitido y esperado. Lo que no está permitido
es que dos bloques **migren** la misma tabla sin coordinarse.

## Desarrollo local: SQL Server con Docker

Cada integrante levanta el mismo entorno con Docker Compose, sin instalar
SQL Server localmente. El archivo `docker-compose.yml` ya está en la raíz
del repo:

```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: smashzone-sqlserver
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourSecurePassword123!"
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P \"$$MSSQL_SA_PASSWORD\" -Q 'SELECT 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s

volumes:
  sqlserver-data:
```

### Levantar el contenedor

```bash
docker compose up -d
```

La primera vez descarga la imagen (~500MB, toma unos minutos). El
healthcheck tarda ~20-30s en pasar a `healthy` — confirmar antes de correr
el seed:

```bash
docker compose ps
# STATUS debe decir "Up ... (healthy)", no "(health: starting)"
```

### Ejecutar `script.sql` (crea la DB + seed completo)

El script empieza con `DROP DATABASE SmashZoneDB` si ya existe, así que
siempre corre contra un estado limpio — úsalo solo en local, nunca contra
un ambiente compartido/producción.

```bash
docker cp Database/script.sql smashzone-sqlserver:/tmp/script.sql
docker exec smashzone-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -C -S localhost -U sa -P "YourSecurePassword123!" -i /tmp/script.sql
```

En Git Bash (Windows) agregar `MSYS_NO_PATHCONV=1` antes de `docker exec`,
si no, Git Bash reescribe `/opt/...` como una ruta de Windows y el comando
falla con "no such file or directory".

**Nota sobre `sqlcmd` e índices filtrados**: `sqlcmd` corre con
`QUOTED_IDENTIFIER OFF` por defecto. Los índices filtrados del script
(`UX_Usuarios_DocumentoIdentidad`, `IX_Historial_Usuario`) necesitan
`QUOTED_IDENTIFIER ON`, por eso el script ya trae un
`SET QUOTED_IDENTIFIER ON;` justo después del `USE SmashZoneDB;` — no
quitarlo, sin eso esos 2 índices fallan en silencio (sqlcmd sigue
corriendo el resto del script sin abortar, así que es fácil no notarlo).

### Connection string local

`appsettings.Development.json` (gitignored, nunca commitear con password
real en `appsettings.json`):

```
Server=localhost,1433;Initial Catalog=SmashZoneDB;User ID=sa;Password=YourSecurePassword123!;TrustServerCertificate=True;
```

## Cambios de schema (DB First)

Flujo para cualquier cambio de tabla/columna/constraint/índice:

1. Editar `script.sql` (agregar `ALTER TABLE` o actualizar el `CREATE TABLE`
   si la DB local aún no tiene datos que conservar).
2. Correr el script contra la DB local (ver sección arriba) para validar
   que aplica sin errores.
3. Regenerar el contexto EF Core:

```bash
cd Backend/Backend
dotnet ef dbcontext scaffold "Server=localhost,1433;Initial Catalog=SmashZoneDB;User ID=sa;Password=YourSecurePassword123!;TrustServerCertificate=True;" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data --context SmashZoneDbContext --force
```

- `--force` sobreescribe los modelos generados — nunca editar a mano un
  archivo bajo `Models/` generado por scaffold, se pierde en el próximo
  scaffold. Lógica custom (validaciones, métodos) va en Services, no en
  la entidad.
- Antes de modificar `script.sql`, hacer `pull` de `main` para evitar
  cambios de schema duplicados/conflictivos entre bloques.
- Commit de `script.sql` + modelos regenerados van juntos en el mismo PR.

## Actividad de usuarios (Bloque 1)

`Usuarios` incluye dos columnas para medir actividad:

- `UltimoAcceso` (`DATETIME2 NULL`): último login exitoso.
- `UltimaActividad` (`DATETIME2 NULL`): último heartbeat o login; un usuario está *online* si es menor a 5 minutos.

Los usuarios de ejemplo del script traen hashes ficticios (no se puede iniciar sesión con ellos).
En desarrollo, definir `SeedAdmin:Email` y `SeedAdmin:Password` en `appsettings.Development.json`
(ver `appsettings.Development.example.json`) hace que la API cree/actualice ese Admin con un hash BCrypt real al arrancar.


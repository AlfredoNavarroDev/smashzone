# Base de datos

Motor: **SQL Server**. Acceso: **EF Core 10**, Code First con migraciones
incrementales (una migración por feature, nunca una migración gigante al
final).

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
SQL Server localmente. Archivo `docker-compose.yml` sugerido en la raíz del
repo (a crear junto con el primer `docker-compose.yml` del proyecto):

```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourSecurePassword123!"
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql

volumes:
  sqlserver-data:
```

Connection string local (`appsettings.Development.json`, nunca commiteado
con password real en `appsettings.json`):

```
Server=localhost,1433;Initial Catalog=SmashZoneDB;User ID=sa;Password=YourSecurePassword123!;TrustServerCertificate=True;
```

## Migraciones

```bash
cd Backend/Backend
dotnet ef migrations add <NombreDescriptivo>
dotnet ef database update
```

- Nombrar migraciones por lo que agregan (`AddReservasTable`,
  `AddInventarioStockColumn`), no `Migration1`, `Migration2`.
- Antes de hacer `dotnet ef migrations add`, hacer `pull` de `main` para
  evitar migraciones duplicadas/conflictivas entre bloques.

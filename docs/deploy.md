# Despliegue

**Estado: plataforma final aún no decidida por el equipo.** Esta sección se
completa cuando se tome la decisión — actualizar este archivo con el
nombre exacto de la plataforma, URLs y pasos reales en cuanto se elija.

## Opciones consideradas (según el spec funcional)

- Azure App Service (+ Azure SQL) — opción usada como ejemplo en el spec
  funcional, integración más directa con SQL Server.
- Railway
- Render
- AWS

## Lo que no depende de la plataforma elegida

### Variables de entorno / configuración requeridas

El Backend necesita estos valores en producción (vía variables de entorno
o configuración del servicio de hosting, nunca hardcodeados en
`appsettings.json`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Initial Catalog=SmashZoneDB;User ID=...;Password=...;"
  },
  "JwtSettings": {
    "Secret": "...",
    "Issuer": "https://<tu-api>.<dominio>",
    "Audience": "https://<tu-frontend>.<dominio>",
    "DurationInMinutes": 120
  }
}
```

### Frontend

`npm run build` genera el bundle estático (`Frontend/dist/`) listo para
servir desde cualquier hosting estático o CDN. La URL del Backend se
configura vía variable de entorno de Vite (`VITE_API_URL`), nunca
hardcodeada en el código.

## Checklist antes de desplegar

- [ ] Elegir plataforma final (actualizar este documento).
- [ ] Migraciones de EF Core aplicadas en la base de datos de producción.
- [ ] `JwtSettings.Secret` real generado (no el de ejemplo del spec).
- [ ] CORS configurado en el Backend para permitir el dominio del Frontend.
- [ ] Variable `VITE_API_URL` del Frontend apuntando a la URL real del
      Backend desplegado.

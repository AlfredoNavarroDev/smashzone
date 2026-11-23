# Contexto técnico de SmashZone

Actualizado: 2026-11-23. `AGENTS.md` define las reglas de arquitectura y trabajo; `docs/` contiene los contratos.

## Arquitectura y estado

- Monorepo: `Backend/` (.NET 10, EF Core 10, SQL Server, JWT) y `Frontend/` (React 19, TypeScript, Vite, React Router). `Database/script.sql` y `docker-compose.yml` preparan SQL Server local.
- Backend: existen endpoints para autenticación, perfil, usuarios, catálogo, reservas, pagos y reportes. La reserva se crea como Pendiente antes del pago; un pago exitoso la confirma. Los contratos están en `docs/api-contracts.md`.
- Frontend: rutas `/login`, `/registro`, `/perfil`, `/admin` y `/admin/usuarios`. La landing pública de un compañero todavía no se ha incorporado a este repositorio. Aquí aún faltan las pantallas de catálogo, reservas y pago. El enlace a registro se quitó del login, aunque `/registro` sigue disponible.
- `/admin`: dashboard de negocio con datos de reportes. Las ocho imágenes de sus piezas se cargan dinámicamente desde `public/images/glass/pieces/` mediante `GlassPanelSurface` y la geometría compartida de `GlassMosaic`.
- `/admin/usuarios`: resumen, búsqueda, filtros, lista paginada, cambio de rol y habilitación de otras cuentas. Se refresca cada 30 s. `UsersGlass` carga ocho imágenes desde `public/images/glass/users/`; dos piezas usan recorte directo y seis pasan por `fitGlassImageAsync`/worker para ajustar su contorno. Los menús de filtros y roles son propios y admiten teclado; el selector de rol de la cuenta propia queda bloqueado.
- `/perfil`: tarjeta de cliente o Admin. Solo Cliente ve el botón interno para cerrar sesión. Admin tiene la superficie de vidrio más oscura y retrato; la salida del panel está en su layout. Los campos de edición de datos y contraseña tienen silueta recortada, fondo oscuro y foco naranja.
- `/login`: `HammerTear` adapta el motor SVG de `pushpin-tear-footer.tsx`. El martillo cae durante 620 ms, gira y refleja luz; al impactar, el borde naranja se retrae, el logo sube y aparece el formulario. Campos con línea inferior; botón blanco recortado que se rellena de naranja. Orbitron se carga desde Google Fonts solo para el título del login y encabezados de dashboard; el contenido usa la fuente del sistema.

## Trabajo local y próximos pasos

- Rama de trabajo: `feature/reportes-dashboard-negocio`. El cambio reúne reportes, estructura base del frontend y ajustes de autenticación, usuarios y perfil; coordinar la revisión de los bloques 1 y 4 antes de integrar en `main`.
- Limpieza previa al commit: se quitaron componentes sin imports (`broken-by-design`, `ShinyLink`, `hover-button-1`), 21 imágenes y archivos de trabajo que no usa el frontend (incluidas variantes antiguas de Usuarios, atlas y pruebas de generación), recuperando unos 20 MiB. Se conservaron las ocho piezas activas de cada dashboard. Las notas de generación se movieron fuera de `public/` a `docs/glass-assets.md`.
- Integrar la landing del compañero cuando llegue su commit/PR: catálogo, creación de reservas, pago y acceso del cliente. Coordinar cambios por bloque según `AGENTS.md`.

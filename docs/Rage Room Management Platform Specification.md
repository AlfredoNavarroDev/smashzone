# 📦 SmashZone — Rage Room Management System

> **Asignatura:** Desarrollo de Aplicaciones Web  
> **Evaluación:** Presentación Final (Semana 16 - 2 de Diciembre, 2026)  
> **Modalidad:** Grupal (Máx. 6 integrantes)  
> **Plataforma de Calificación:** U+  

---

## 📋 Tabla de Contenidos
1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Requisitos Técnicos & Arquitectura](#-requisitos-técnicos--arquitectura)
3. [Roles y Permisos (RBAC)](#-roles-y-permisos-rbac)
4. [Especificación del Dominio y Módulos](#-especificación-del-dominio-y-módulos)
5. [Modelo de Base de Datos (E-R)](#-modelo-de-base-de-datos-e-r)
6. [Flujos Principales del Sistema](#-flujos-principales-del-sistema)
7. [Despliegue y Variables de Entorno](#-despliegue-y-variables-de-entorno)
8. [Estructura de la Presentación (Semana 16)](#-estructura-de-la-presentación-semana-16)

---

## 💥 Descripción del Proyecto

**SmashZone** es una plataforma web integral diseñada para la gestión operativa y comercial de un negocio de *Rage Room* (Salas de Destrucción). El sistema permite a los clientes reservar salas, seleccionar paquetes de destrucción y equipamiento extra, mientras que los administradores e instructores gestionan la disponibilidad, el inventario de objetos a destruir, la seguridad y el control de reservas en tiempo real.

---

## 🛠 Requisitos Técnicos & Arquitectura

### 1. Tecnologías Empleadas
- **Backend:** .NET 10 Web API
- **Frontend:** Single Page Application (React / Angular / Vue) o ASP.NET Core MVC (según elección final del grupo)
- **Base de Datos:** Microsoft SQL Server
- **ORM / Acceso a Datos:** Entity Framework Core 10
- **Mapeo de Objetos:** AutoMapper (Mapeo entre Entidades y DTOs)
- **Autenticación & Autorización:** JWT (JSON Web Tokens) o Identity Framework con Cookies
- **Validación:** DataAnnotations & FluentValidation

### 2. Diagrama de Arquitectura
```text
[ Cliente (Web Browser / SPA) ]
            │
            │ HTTP / HTTPS (JSON Payload)
            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (.NET 10 API)                │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Controllers (Endpoints)                            │ │
│ └─────────────────────────┬──────────────────────────┘ │
│                           ▼                            │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Services Layer (Business Logic + AutoMapper DTOs) │ │
│ └─────────────────────────┬──────────────────────────┘ │
│                           ▼                            │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Data Layer (EF Core 10 + DataAnnotations)          │ │
│ └─────────────────────────┬──────────────────────────┘ │
└───────────────────────────┼────────────────────────────┘
                            ▼
               [ SQL Server Database (Cloud) ]
```

---

## 🔐 Roles y Permisos (RBAC)

| Rol | Descripción | Permisos Clave |
| :--- | :--- | :--- |
| **Admin** | Administrador del sistema | Gestión completa de usuarios, salas, inventarios, tarifas, reportes de ingresos e historial global. |
| **Staff / Instructor** | Personal en local | Confirmación de check-in, asignación de equipos de protección, control de sesiones en tiempo real y registro de mermas/daños. |
| **Cliente** | Usuario final | Registro/Login, navegación del catálogo de paquetes, reserva de salas con fecha y hora, simulación de pago y gestión de su historial. |

---

## 📦 Especificación del Dominio y Módulos

1. **Módulo de Autenticación y Seguridad:**
   - Registro de usuarios clientes.
   - Autenticación segura mediante JWT o ASP.NET Core Identity.
   - Control de acceso por Roles (`[Authorize(Roles = "Admin,Staff")]`).

2. **Módulo de Salas y Paquetes (Catálogo):**
   - Configuración de Salas (Nombre, capacidad máxima de personas, estado activa/mantenimiento).
   - Paquetes de Destrucción (ej. "Rage Basic", "Couples Therapy", "Mega Destruction") con precios y lista de ítems incluidos (ej. 10 botellas, 2 electrodomésticos).

3. **Módulo de Reservas y Agendamiento:**
   - Selección de sala, paquete, ítems extra (ej. TV adicional, impresoras), fecha y bloque horario disponible.
   - Prevención de solapamiento de reservas (bloqueo automático de horarios ocupados).

4. **Módulo de Pago Simulado & Facturación:**
   - Integración simulada de pasarela de pago (tarjeta de crédito/débito).
   - Generación de comprobante electrónico (Resumen de Reserva / Voucher DTO).

5. **Módulo de Operaciones e Inventario (Staff/Admin):**
   - Control de stock de objetos destruibles (electrodomésticos, vajilla, cristal).
   - Registro de estado de la reserva (`Pendiente`, `Confirmada`, `En Curso`, `Completada`, `Cancelada`).

6. **Módulo de Reportes & Dashboards (Frontend Graphics):**
   - Gráficos interactivos de ingresos por mes, paquete más demandado y horas pico de reserva.

---

## 🗄 Modelo de Base de Datos (E-R)

### Entidades y Relaciones

```text
[Usuarios] 1 ──── N [Reservas] N ──── 1 [Salas]
    │                    │
    ├─ (RolID)           ├─ N ──── 1 [Paquetes]
    │                    │
    ▼                    └─ 1 ──── N [DetalleReservaExtras] N ──── 1 [ItemsInventario]
[Roles]
```

### Tabla de Entidades (SQL Schema Conceptual)

```sql
-- 1. ROLES Y USUARIOS
CREATE TABLE Roles (
    RolID INT PRIMARY KEY IDENTITY(1,1),
    Nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Usuarios (
    UsuarioID INT PRIMARY KEY IDENTITY(1,1),
    Nombre VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash VARCHAR(MAX) NOT NULL,
    Telefono VARCHAR(20),
    RolID INT FOREIGN KEY REFERENCES Roles(RolID),
    FechaRegistro DATETIME DEFAULT GETDATE()
);

-- 2. INFRAESTRUCTURA Y SERVICIOS
CREATE TABLE Salas (
    SalaID INT PRIMARY KEY IDENTITY(1,1),
    Nombre VARCHAR(50) NOT NULL,
    CapacidadMaxima INT NOT NULL,
    Estado VARCHAR(20) DEFAULT 'Disponible' -- Disponible, Mantenimiento
);

CREATE TABLE Paquetes (
    PaqueteID INT PRIMARY KEY IDENTITY(1,1),
    Nombre VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    Precio DECIMAL(10,2) NOT NULL,
    DuracionMinutos INT NOT NULL,
    Activo BIT DEFAULT 1
);

CREATE TABLE ItemsInventario (
    ItemID INT PRIMARY KEY IDENTITY(1,1),
    Nombre VARCHAR(100) NOT NULL,
    Categoria VARCHAR(50), -- Electrodomésticos, Vidrio, Electrónica
    PrecioAdicional DECIMAL(10,2) NOT NULL,
    StockActual INT NOT NULL
);

-- 3. RESERVAS Y FACTURACIÓN
CREATE TABLE Reservas (
    ReservaID INT PRIMARY KEY IDENTITY(1,1),
    UsuarioID INT FOREIGN KEY REFERENCES Usuarios(UsuarioID),
    SalaID INT FOREIGN KEY REFERENCES Salas(SalaID),
    PaquetesID INT FOREIGN KEY REFERENCES Paquetes(PaqueteID),
    FechaHoraInicio DATETIME NOT NULL,
    FechaHoraFin DATETIME NOT NULL,
    Estado VARCHAR(30) DEFAULT 'Pendiente', -- Pendiente, Confirmada, Finalizada, Cancelada
    MontoTotal DECIMAL(10,2) NOT NULL,
    FechaCreacion DATETIME DEFAULT GETDATE()
);

CREATE TABLE DetalleReservaExtras (
    DetalleID INT PRIMARY KEY IDENTITY(1,1),
    ReservaID INT FOREIGN KEY REFERENCES Reservas(ReservaID),
    ItemID INT FOREIGN KEY REFERENCES ItemsInventario(ItemID),
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL
);

CREATE TABLE Pagos (
    PagoID INT PRIMARY KEY IDENTITY(1,1),
    ReservaID INT FOREIGN KEY REFERENCES Reservas(ReservaID),
    Monto DECIMAL(10,2) NOT NULL,
    MetodoPago VARCHAR(50) NOT NULL, -- Tarjeta, Simulación
    TransaccionRef VARCHAR(100) NOT NULL,
    FechaPago DATETIME DEFAULT GETDATE()
);
```

---

## 🔄 Flujos Principales del Sistema

### Flujo de Cliente (Reserva e Integración DTO/AutoMapper)
1. **Petición HTTP:** `POST /api/reservas`
2. **DTO recibido (`CrearReservaDTO`):**
   ```json
   {
     "salaId": 1,
     "paqueteId": 2,
     "fechaHoraInicio": "2026-12-10T16:00:00",
     "extras": [
       { "itemId": 5, "cantidad": 2 }
     ]
   }
   ```
3. **Mapeo:** AutoMapper convierte `CrearReservaDTO` $\rightarrow$ `Reserva` (Entidad Dominio).
4. **Validación (DataAnnotations / Rules):** Verificación de stock, estado activo de la sala y ausencia de cruces de horarios.
5. **Persistencia:** Guardado en SQL Server mediante EF Core en una transacción.
6. **Respuesta:** Mapeo de `Reserva` $\rightarrow$ `ReservaDetalleDTO` devuelto al cliente con código HTTP `201 Created`.

---

## ☁️ Despliegue y Variables de Entorno

El proyecto debe ser preparado para despliegue en la nube (ej. Azure App Service / Railway / Render / AWS):

### Archivo `appsettings.json` (o Variables de Entorno en Cloud)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:smashzone-db.database.windows.net,1433;Initial Catalog=SmashZoneDB;User ID=admin;Password=YourSecurePassword123!;"
  },
  "JwtSettings": {
    "Secret": "SuperSecretKeyForJWTTokenGenerationSmashZone2026",
    "Issuer": "https://smashzone-api.azurewebsites.net",
    "Audience": "https://smashzone-app.azurewebsites.net",
    "DurationInMinutes": 120
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

---

## 📢 Estructura de la Presentación (Semana 16)

La exposición durará **15 minutos** y todos los integrantes presentarán en vestimenta formal.

1. **Demostración del Producto Funcional en vivo (6 min):**
   - Flujo de reserva por parte de un usuario final.
   - Pago simulado y confirmación.
   - Gestión de la reserva desde el rol Staff/Admin.
   - Visualización de estadísticas en el Dashboard.
2. **Explicación de Arquitectura y Código (5 min):**
   - Mapeos con AutoMapper entre Entidades y DTOs.
   - Demostración de validación con DataAnnotations.
   - Diagrama E-R y conexión a SQL Server en la nube.
3. **Desafíos, Lecciones y Preguntas (4 min):**
   - Solución al problema de solapamiento de horarios.
   - Decisiones arquitectónicas (por qué API + SPA o MVC).
-- ============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: SmashZone (Rage Room)
-- Motor objetivo: SQL Server 2019+ / Azure SQL Database
-- Compatibilidad Backend: .NET 10 (Entity Framework Core / Dapper)
-- ============================================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'SmashZoneDB')
BEGIN
    ALTER DATABASE SmashZoneDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SmashZoneDB;
END
GO

CREATE DATABASE SmashZoneDB;
GO

USE SmashZoneDB;
GO

-- Requerido por los indices filtrados de la seccion 5 (UX_Usuarios_DocumentoIdentidad,
-- IX_Historial_Usuario). sqlcmd corre con QUOTED_IDENTIFIER OFF por defecto, y SQL Server
-- rechaza CREATE INDEX ... WHERE sin esta opcion en ON (Msg 1934).
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. TABLAS DE SEGURIDAD, USUARIOS Y ROLES
-- ============================================================================

CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(200) NULL,
    FechaCreacion DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE Usuarios (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IdRol INT NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Apellido NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    Telefono NVARCHAR(20) NULL,
    DocumentoIdentidad NVARCHAR(20) NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaRegistro DATETIME2 DEFAULT GETUTCDATE(),
    UltimoAcceso DATETIME2 NULL,      -- ultimo login exitoso
    UltimaActividad DATETIME2 NULL,   -- ultimo heartbeat (online = < 5 min)
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (IdRol) REFERENCES Roles(Id)
);

-- ============================================================================
-- 2. CATÁLOGOS: SALAS, PAQUETES E INVENTARIO DE EXTRAS
-- ============================================================================

CREATE TABLE Salas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    CapacidadMaxima INT NOT NULL CHECK (CapacidadMaxima > 0),
    Descripcion NVARCHAR(500) NULL,
    Activa BIT NOT NULL DEFAULT 1
);

CREATE TABLE Paquetes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(MAX) NOT NULL,
    Precio DECIMAL(10, 2) NOT NULL CHECK (Precio >= 0),
    DuracionMinutos INT NOT NULL CHECK (DuracionMinutos > 0),
    MaxParticipantes INT NOT NULL DEFAULT 1 CHECK (MaxParticipantes > 0),
    CantidadItemsEstandar INT NOT NULL DEFAULT 15 CHECK (CantidadItemsEstandar >= 0),
    Activo BIT NOT NULL DEFAULT 1
);

CREATE TABLE ItemsExtras (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    Categoria NVARCHAR(50) NOT NULL,
    PrecioUnitario DECIMAL(10, 2) NOT NULL CHECK (PrecioUnitario >= 0),
    StockDisponible INT NOT NULL DEFAULT 0 CHECK (StockDisponible >= 0),
    Activo BIT NOT NULL DEFAULT 1
);

-- ============================================================================
-- 3. TABLAS TRANSACCIONALES: RESERVAS Y DETALLES
-- ============================================================================

CREATE TABLE EstadosReserva (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Reservas (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IdCliente UNIQUEIDENTIFIER NOT NULL,
    IdSala INT NOT NULL,
    IdPaquete INT NOT NULL,
    IdEstado INT NOT NULL,
    FechaHoraInicio DATETIME2 NOT NULL,
    FechaHoraFin DATETIME2 NOT NULL,
    NumParticipantes INT NOT NULL CHECK (NumParticipantes > 0),
    MontoPaquete DECIMAL(10, 2) NOT NULL CHECK (MontoPaquete >= 0),
    MontoExtras DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (MontoExtras >= 0),
    MontoTotal AS (MontoPaquete + MontoExtras), -- Columna calculada
    NotasEspeciales NVARCHAR(500) NULL,
    FechaCreacion DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Reservas_Usuarios FOREIGN KEY (IdCliente) REFERENCES Usuarios(Id),
    CONSTRAINT FK_Reservas_Salas FOREIGN KEY (IdSala) REFERENCES Salas(Id),
    CONSTRAINT FK_Reservas_Paquetes FOREIGN KEY (IdPaquete) REFERENCES Paquetes(Id),
    CONSTRAINT FK_Reservas_Estados FOREIGN KEY (IdEstado) REFERENCES EstadosReserva(Id),
    CONSTRAINT CHK_FechasReserva CHECK (FechaHoraFin > FechaHoraInicio)
);

CREATE TABLE DetallesReservaExtras (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    IdReserva UNIQUEIDENTIFIER NOT NULL,
    IdItemExtra INT NOT NULL,
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    PrecioUnitarioHistorico DECIMAL(10, 2) NOT NULL CHECK (PrecioUnitarioHistorico >= 0),
    Subtotal AS (Cantidad * PrecioUnitarioHistorico), -- Columna calculada

    CONSTRAINT FK_Detalles_Reservas FOREIGN KEY (IdReserva) REFERENCES Reservas(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Detalles_ItemsExtras FOREIGN KEY (IdItemExtra) REFERENCES ItemsExtras(Id)
);

-- Auditoria de transiciones de estado de una Reserva (Pendiente -> Confirmada
-- -> EnProceso -> Completada/Cancelada). IdEstadoAnterior NULL = primer
-- registro (creacion de la reserva). IdUsuarioCambio NULL = cambio hecho
-- por el sistema (ej. job automatico), no por Staff/Admin.
CREATE TABLE HistorialEstadosReserva (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    IdReserva UNIQUEIDENTIFIER NOT NULL,
    IdEstadoAnterior INT NULL,
    IdEstadoNuevo INT NOT NULL,
    IdUsuarioCambio UNIQUEIDENTIFIER NULL,
    FechaCambio DATETIME2 DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Historial_Reservas FOREIGN KEY (IdReserva) REFERENCES Reservas(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Historial_EstadoAnterior FOREIGN KEY (IdEstadoAnterior) REFERENCES EstadosReserva(Id),
    CONSTRAINT FK_Historial_EstadoNuevo FOREIGN KEY (IdEstadoNuevo) REFERENCES EstadosReserva(Id),
    CONSTRAINT FK_Historial_Usuarios FOREIGN KEY (IdUsuarioCambio) REFERENCES Usuarios(Id)
);

-- ============================================================================
-- 4. PAGOS Y REGISTRO LEGAL / AUDITORÍA
-- ============================================================================

CREATE TABLE MetodosPago (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Pagos (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IdReserva UNIQUEIDENTIFIER NOT NULL,
    IdMetodoPago INT NOT NULL,
    Monto DECIMAL(10, 2) NOT NULL CHECK (Monto > 0),
    TransaccionRef NVARCHAR(100) NULL,
    Exitoso BIT NOT NULL DEFAULT 1,
    FechaPago DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Pagos_Reservas FOREIGN KEY (IdReserva) REFERENCES Reservas(Id),
    CONSTRAINT FK_Pagos_MetodosPago FOREIGN KEY (IdMetodoPago) REFERENCES MetodosPago(Id)
);

CREATE TABLE ExencionesResponsabilidad (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    IdReserva UNIQUEIDENTIFIER NOT NULL UNIQUE,
    Firmado BIT NOT NULL DEFAULT 0,
    FechaFirma DATETIME2 NULL,
    EnlaceDocumentoPDF NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Exenciones_Reservas FOREIGN KEY (IdReserva) REFERENCES Reservas(Id)
);

-- ============================================================================
-- 5. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN DE CONSULTAS FRECUENTES)
-- ============================================================================

-- Búsqueda de disponibilidad por sala y franja horaria (evita solapamientos)
CREATE INDEX IX_Reservas_Sala_Fechas ON Reservas (IdSala, FechaHoraInicio, FechaHoraFin);

-- Consulta de historial de reservas por usuario
CREATE INDEX IX_Reservas_Cliente ON Reservas (IdCliente);

-- Auditoria admin: historial de cambios de estado por reserva (orden cronologico)
CREATE INDEX IX_Historial_Reserva_Fecha ON HistorialEstadosReserva (IdReserva, FechaCambio);

-- Auditoria admin: "que cambios hizo este Staff/Admin" (filtra NULL = cambios de sistema)
CREATE INDEX IX_Historial_Usuario ON HistorialEstadosReserva (IdUsuarioCambio) WHERE IdUsuarioCambio IS NOT NULL;

-- Autenticación rápida por Email
CREATE INDEX IX_Usuarios_Email ON Usuarios (Email);

-- DocumentoIdentidad: unico SOLO cuando no es NULL (SQL Server trata NULL
-- como valor en un UNIQUE constraint normal, permitiendo solo un registro
-- sin documento en toda la tabla; el indice filtrado corrige eso).
CREATE UNIQUE INDEX UX_Usuarios_DocumentoIdentidad
ON Usuarios (DocumentoIdentidad)
WHERE DocumentoIdentidad IS NOT NULL;

GO

-- ============================================================================
-- 6. POBLACIÓN DE DATOS SEMILLA (SEED DATA COMPLETO)
-- ============================================================================

-- 6.1 ROLES
INSERT INTO Roles (Nombre, Descripcion) VALUES 
('Admin', 'Administrador del sistema con acceso total a configuración y reportes.'),
('Staff', 'Personal de recepción y supervisión de salas.'),
('Cliente', 'Usuario registrado que reserva experiencias.');

-- 6.2 ESTADOS DE RESERVA
INSERT INTO EstadosReserva (Nombre) VALUES 
('Pendiente'),
('Confirmada'),
('EnProceso'),
('Completada'),
('Cancelada');

-- 6.3 MÉTODOS DE PAGO
-- 'Tarjeta de Crédito/Débito' es el único método de gateway: se procesa
-- vía Culqi (pasarela real para Perú, ver docs/superpowers/specs/2026-11-10-bloque3-core-transaccional-design.md).
-- 'Transferencia Bancaria' y 'Efectivo' son manuales: Staff/Admin confirma
-- el pago a mano, no pasan por ningún gateway.
INSERT INTO MetodosPago (Nombre) VALUES
('Tarjeta de Crédito/Débito'),
('Transferencia Bancaria'),
('Efectivo');

-- 6.4 SALAS DISPONIBLES
INSERT INTO Salas (Nombre, CapacidadMaxima, Descripcion, Activa) VALUES 
('Sala Chaos', 2, 'Diseñada para parejas o dúos. Equipada con altavoces Bluetooth de alta potencia.', 1),
('Sala Destruction', 4, 'Sala grande para grupos de hasta 4 personas con múltiples estantes de impacto.', 1),
('Sala VIP Rage', 6, 'Espacio amplio con zona de descanso adyacente y grabación en video opcional.', 1),
('Sala Heavy Metal', 3, 'Equipada con protección reforzada e iluminación neón.', 1),
('Sala Rage Solo Express', 1, 'Habitación compacta insonorizada individual para descargas rápidas.', 1),
('Sala Destruction Outdoor', 8, 'Espacio al aire libre con protecciones perimetrales para eventos corporativos.', 1);

-- 6.5 PAQUETES
INSERT INTO Paquetes (Nombre, Descripcion, Precio, DuracionMinutos, MaxParticipantes, CantidadItemsEstandar, Activo) VALUES 
('Express Stress Relief', 'Ideal para descargar tensión rápidamente. Incluye 15 objetos de vidrio/cerámica.', 25.00, 20, 1, 15, 1),
('Duo Smash Party', 'Pensado para 2 personas. Incluye 30 objetos variados + 1 electrodoméstico mediano.', 45.00, 30, 2, 30, 1),
('Total Wreck Havoc', 'Paquete completo para 4 personas. 60 objetos variados + 2 electrodomésticos grandes.', 85.00, 45, 4, 60, 1),
('Office Therapy', 'Especial para oficinistas. Incluye 20 ítems de vidrio, 2 teclados y 1 monitor CRT.', 35.00, 25, 1, 22, 1),
('Rage Corporate Team', 'Paquete para grupos de hasta 6 personas. 100 ítems variados + 4 electrodomésticos.', 140.00, 60, 6, 100, 1),
('Smash & Crash Couple Special', 'Cita diferente para parejas. 40 objetos de cerámica/vidrio + 1 electrodoméstico mediano.', 60.00, 35, 2, 40, 1);

-- 6.6 CATÁLOGO DE ITEMS EXTRAS
INSERT INTO ItemsExtras (Nombre, Categoria, PrecioUnitario, StockDisponible, Activo) VALUES 
('Televisor Antiguo CRT 21"', 'Electrodomésticos', 15.00, 10, 1),
('Impresora Láser de Oficina', 'Electrónica', 12.00, 15, 1),
('Set de 10 Botellas de Vidrio', 'Vidrio', 5.00, 100, 1),
('Teclado de Computadora', 'Electrónica', 4.00, 30, 1),
('Guitarra Acústica Vieja', 'Especiales', 20.00, 5, 1),
('Laptop Obsoleta', 'Electrónica', 18.00, 8, 1),
('Horno Microondas', 'Electrodomésticos', 22.00, 6, 1),
('Lote 5 Platos de Cerámica', 'Vajilla', 6.00, 50, 1),
('Teléfono Fijo de Disco / Antiguo', 'Electrónica', 8.00, 12, 1),
('Monitor de PC Pantalla Plana', 'Electrónica', 14.00, 15, 1),
('Reproductor DVD / VHS', 'Electrónica', 10.00, 10, 1),
('Maniquí de Vestir', 'Especiales', 25.00, 4, 1),
('Guitarra Eléctrica Descompuesta', 'Especiales', 30.00, 3, 1),
('Parabrisas de Auto', 'Especiales', 45.00, 2, 1),
('Silla de Oficina', 'Mobiliario', 16.00, 7, 1);

-- 6.7 USUARIOS (ADMIN, STAFF Y CLIENTES)
DECLARE @IdAdmin UNIQUEIDENTIFIER = NEWID();
DECLARE @IdStaff1 UNIQUEIDENTIFIER = NEWID();
DECLARE @IdStaff2 UNIQUEIDENTIFIER = NEWID();
DECLARE @IdCliente1 UNIQUEIDENTIFIER = NEWID();
DECLARE @IdCliente2 UNIQUEIDENTIFIER = NEWID();
DECLARE @IdCliente3 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Usuarios (Id, IdRol, Nombre, Apellido, Email, PasswordHash, Telefono, DocumentoIdentidad, Activo) VALUES 
(@IdAdmin, 1, 'Admin', 'SmashZone', 'admin@smashzone.com', 'AQAAAAEAACcQAAAAEHhashedpasswordexample...', '999888777', '00000000', 1),
(@IdStaff1, 2, 'Carlos', 'Mendoza', 'carlos.mendoza@smashzone.com', 'AQAAAAEAACcQAAAAEHSampleHashStaff1...', '987654321', '45879632', 1),
(@IdStaff2, 2, 'Lucía', 'Fernández', 'lucia.fernandez@smashzone.com', 'AQAAAAEAACcQAAAAEHSampleHashStaff2...', '987654322', '45879633', 1),
(@IdCliente1, 3, 'Ana', 'García', 'ana.garcia@gmail.com', 'AQAAAAEAACcQAAAAEHSampleHashClient1...', '912345678', '71234567', 1),
(@IdCliente2, 3, 'Roberto', 'Gómez', 'roberto.gomez@hotmail.com', 'AQAAAAEAACcQAAAAEHSampleHashClient2...', '923456789', '72345678', 1),
(@IdCliente3, 3, 'Valeria', 'Rios', 'v.rios@yahoo.com', 'AQAAAAEAACcQAAAAEHSampleHashClient3...', '934567890', '73456789', 1);

-- 6.8 RESERVAS Y SUS TRANSACCIONES CONEXAS
DECLARE @Reserva1 UNIQUEIDENTIFIER = NEWID();
DECLARE @Reserva2 UNIQUEIDENTIFIER = NEWID();
DECLARE @Reserva3 UNIQUEIDENTIFIER = NEWID();

-- Reserva 1: Completada con extras y pago
INSERT INTO Reservas (Id, IdCliente, IdSala, IdPaquete, IdEstado, FechaHoraInicio, FechaHoraFin, NumParticipantes, MontoPaquete, MontoExtras, NotasEspeciales, FechaCreacion)
VALUES (
    @Reserva1, @IdCliente1, 1, 2, 4, 
    DATEADD(DAY, -2, GETUTCDATE()), DATEADD(MINUTE, 30, DATEADD(DAY, -2, GETUTCDATE())), 
    2, 45.00, 18.00, 'Celebración de aniversario.', DATEADD(DAY, -5, GETUTCDATE())
);

INSERT INTO DetallesReservaExtras (IdReserva, IdItemExtra, Cantidad, PrecioUnitarioHistorico) VALUES 
(@Reserva1, 6, 1, 18.00); -- 1x Laptop Obsoleta

INSERT INTO Pagos (IdReserva, IdMetodoPago, Monto, TransaccionRef, Exitoso, FechaPago) VALUES
(@Reserva1, 1, 63.00, 'TXN-CULQI-998811', 1, DATEADD(DAY, -5, GETUTCDATE()));

INSERT INTO ExencionesResponsabilidad (IdReserva, Firmado, FechaFirma, EnlaceDocumentoPDF) VALUES
(@Reserva1, 1, DATEADD(DAY, -2, GETUTCDATE()), 'https://storage.smashzone.com/waivers/waiver-res1.pdf');

-- Historial de estados Reserva 1: ciclo completo Pendiente -> Confirmada -> EnProceso -> Completada
INSERT INTO HistorialEstadosReserva (IdReserva, IdEstadoAnterior, IdEstadoNuevo, IdUsuarioCambio, FechaCambio) VALUES
(@Reserva1, NULL, 1, NULL, DATEADD(DAY, -5, GETUTCDATE())),
(@Reserva1, 1, 2, @IdStaff1, DATEADD(HOUR, 2, DATEADD(DAY, -5, GETUTCDATE()))),
(@Reserva1, 2, 3, @IdStaff1, DATEADD(DAY, -2, GETUTCDATE())),
(@Reserva1, 3, 4, @IdStaff1, DATEADD(MINUTE, 30, DATEADD(DAY, -2, GETUTCDATE())));

-- Reserva 2: Confirmada
INSERT INTO Reservas (Id, IdCliente, IdSala, IdPaquete, IdEstado, FechaHoraInicio, FechaHoraFin, NumParticipantes, MontoPaquete, MontoExtras, NotasEspeciales, FechaCreacion)
VALUES (
    @Reserva2, @IdCliente2, 2, 3, 2, 
    DATEADD(DAY, 1, GETUTCDATE()), DATEADD(MINUTE, 45, DATEADD(DAY, 1, GETUTCDATE())), 
    4, 85.00, 30.00, 'Solicitan grabación en video.', DATEADD(DAY, -1, GETUTCDATE())
);

INSERT INTO DetallesReservaExtras (IdReserva, IdItemExtra, Cantidad, PrecioUnitarioHistorico) VALUES 
(@Reserva2, 1, 2, 15.00); -- 2x TV CRT 21"

INSERT INTO Pagos (IdReserva, IdMetodoPago, Monto, TransaccionRef, Exitoso, FechaPago) VALUES
(@Reserva2, 2, 115.00, 'TRANSF-BCP-445566', 1, DATEADD(DAY, -1, GETUTCDATE()));

-- Historial de estados Reserva 2: Pendiente -> Confirmada
INSERT INTO HistorialEstadosReserva (IdReserva, IdEstadoAnterior, IdEstadoNuevo, IdUsuarioCambio, FechaCambio) VALUES
(@Reserva2, NULL, 1, NULL, DATEADD(DAY, -1, GETUTCDATE())),
(@Reserva2, 1, 2, @IdStaff2, DATEADD(HOUR, 3, DATEADD(DAY, -1, GETUTCDATE())));

-- Reserva 3: Pendiente
INSERT INTO Reservas (Id, IdCliente, IdSala, IdPaquete, IdEstado, FechaHoraInicio, FechaHoraFin, NumParticipantes, MontoPaquete, MontoExtras, NotasEspeciales, FechaCreacion)
VALUES (
    @Reserva3, @IdCliente3, 4, 4, 1,
    DATEADD(DAY, 3, GETUTCDATE()), DATEADD(MINUTE, 25, DATEADD(DAY, 3, GETUTCDATE())),
    1, 35.00, 0.00, 'Cliente primerizo.', GETUTCDATE()
);

-- Historial de estados Reserva 3: recien creada, sin cambios de Staff aun
INSERT INTO HistorialEstadosReserva (IdReserva, IdEstadoAnterior, IdEstadoNuevo, IdUsuarioCambio, FechaCambio) VALUES
(@Reserva3, NULL, 1, NULL, GETUTCDATE());

GO
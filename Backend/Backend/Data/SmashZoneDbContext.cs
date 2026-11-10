using System;
using System.Collections.Generic;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public partial class SmashZoneDbContext : DbContext
{
    public SmashZoneDbContext()
    {
    }

    public SmashZoneDbContext(DbContextOptions<SmashZoneDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<DetallesReservaExtra> DetallesReservaExtras { get; set; }

    public virtual DbSet<EstadosReserva> EstadosReservas { get; set; }

    public virtual DbSet<ExencionesResponsabilidad> ExencionesResponsabilidads { get; set; }

    public virtual DbSet<HistorialEstadosReserva> HistorialEstadosReservas { get; set; }

    public virtual DbSet<ItemsExtra> ItemsExtras { get; set; }

    public virtual DbSet<MetodosPago> MetodosPagos { get; set; }

    public virtual DbSet<Pago> Pagos { get; set; }

    public virtual DbSet<Paquete> Paquetes { get; set; }

    public virtual DbSet<Reserva> Reservas { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Sala> Salas { get; set; }

    public virtual DbSet<Usuario> Usuarios { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DetallesReservaExtra>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Detalles__3214EC0794569D8B");

            entity.Property(e => e.PrecioUnitarioHistorico).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Subtotal)
                .HasComputedColumnSql("([Cantidad]*[PrecioUnitarioHistorico])", false)
                .HasColumnType("decimal(21, 2)");

            entity.HasOne(d => d.IdItemExtraNavigation).WithMany(p => p.DetallesReservaExtras)
                .HasForeignKey(d => d.IdItemExtra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Detalles_ItemsExtras");

            entity.HasOne(d => d.IdReservaNavigation).WithMany(p => p.DetallesReservaExtras)
                .HasForeignKey(d => d.IdReserva)
                .HasConstraintName("FK_Detalles_Reservas");
        });

        modelBuilder.Entity<EstadosReserva>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__EstadosR__3214EC07D0157E5B");

            entity.ToTable("EstadosReserva");

            entity.HasIndex(e => e.Nombre, "UQ__EstadosR__75E3EFCF273EB735").IsUnique();

            entity.Property(e => e.Nombre).HasMaxLength(50);
        });

        modelBuilder.Entity<ExencionesResponsabilidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Exencion__3214EC079C19597B");

            entity.ToTable("ExencionesResponsabilidad");

            entity.HasIndex(e => e.IdReserva, "UQ__Exencion__0E49C69C0A55CDCD").IsUnique();

            entity.Property(e => e.EnlaceDocumentoPdf).HasColumnName("EnlaceDocumentoPDF");

            entity.HasOne(d => d.IdReservaNavigation).WithOne(p => p.ExencionesResponsabilidad)
                .HasForeignKey<ExencionesResponsabilidad>(d => d.IdReserva)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Exenciones_Reservas");
        });

        modelBuilder.Entity<HistorialEstadosReserva>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Historia__3214EC07671639EE");

            entity.ToTable("HistorialEstadosReserva");

            entity.HasIndex(e => new { e.IdReserva, e.FechaCambio }, "IX_Historial_Reserva_Fecha");

            entity.HasIndex(e => e.IdUsuarioCambio, "IX_Historial_Usuario").HasFilter("([IdUsuarioCambio] IS NOT NULL)");

            entity.Property(e => e.FechaCambio).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.IdEstadoAnteriorNavigation).WithMany(p => p.HistorialEstadosReservaIdEstadoAnteriorNavigations)
                .HasForeignKey(d => d.IdEstadoAnterior)
                .HasConstraintName("FK_Historial_EstadoAnterior");

            entity.HasOne(d => d.IdEstadoNuevoNavigation).WithMany(p => p.HistorialEstadosReservaIdEstadoNuevoNavigations)
                .HasForeignKey(d => d.IdEstadoNuevo)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Historial_EstadoNuevo");

            entity.HasOne(d => d.IdReservaNavigation).WithMany(p => p.HistorialEstadosReservas)
                .HasForeignKey(d => d.IdReserva)
                .HasConstraintName("FK_Historial_Reservas");

            entity.HasOne(d => d.IdUsuarioCambioNavigation).WithMany(p => p.HistorialEstadosReservas)
                .HasForeignKey(d => d.IdUsuarioCambio)
                .HasConstraintName("FK_Historial_Usuarios");
        });

        modelBuilder.Entity<ItemsExtra>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ItemsExt__3214EC078D02D48F");

            entity.HasIndex(e => e.Nombre, "UQ__ItemsExt__75E3EFCFA000350D").IsUnique();

            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.Categoria).HasMaxLength(50);
            entity.Property(e => e.Nombre).HasMaxLength(100);
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(10, 2)");
        });

        modelBuilder.Entity<MetodosPago>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__MetodosP__3214EC072A5B4EDF");

            entity.ToTable("MetodosPago");

            entity.HasIndex(e => e.Nombre, "UQ__MetodosP__75E3EFCF4AF89934").IsUnique();

            entity.Property(e => e.Nombre).HasMaxLength(50);
        });

        modelBuilder.Entity<Pago>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Pagos__3214EC078757EE83");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Exitoso).HasDefaultValue(true);
            entity.Property(e => e.FechaPago).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Monto).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.TransaccionRef).HasMaxLength(100);

            entity.HasOne(d => d.IdMetodoPagoNavigation).WithMany(p => p.Pagos)
                .HasForeignKey(d => d.IdMetodoPago)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Pagos_MetodosPago");

            entity.HasOne(d => d.IdReservaNavigation).WithMany(p => p.Pagos)
                .HasForeignKey(d => d.IdReserva)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Pagos_Reservas");
        });

        modelBuilder.Entity<Paquete>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Paquetes__3214EC0723E5968B");

            entity.HasIndex(e => e.Nombre, "UQ__Paquetes__75E3EFCFAC09200E").IsUnique();

            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.CantidadItemsEstandar).HasDefaultValue(15);
            entity.Property(e => e.MaxParticipantes).HasDefaultValue(1);
            entity.Property(e => e.Nombre).HasMaxLength(100);
            entity.Property(e => e.Precio).HasColumnType("decimal(10, 2)");
        });

        modelBuilder.Entity<Reserva>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Reservas__3214EC07F6691B40");

            entity.HasIndex(e => e.IdCliente, "IX_Reservas_Cliente");

            entity.HasIndex(e => new { e.IdSala, e.FechaHoraInicio, e.FechaHoraFin }, "IX_Reservas_Sala_Fechas");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.FechaCreacion).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.MontoExtras).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MontoPaquete).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MontoTotal)
                .HasComputedColumnSql("([MontoPaquete]+[MontoExtras])", false)
                .HasColumnType("decimal(11, 2)");
            entity.Property(e => e.NotasEspeciales).HasMaxLength(500);

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.Reservas)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reservas_Usuarios");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Reservas)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reservas_Estados");

            entity.HasOne(d => d.IdPaqueteNavigation).WithMany(p => p.Reservas)
                .HasForeignKey(d => d.IdPaquete)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reservas_Paquetes");

            entity.HasOne(d => d.IdSalaNavigation).WithMany(p => p.Reservas)
                .HasForeignKey(d => d.IdSala)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reservas_Salas");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Roles__3214EC076E79B650");

            entity.HasIndex(e => e.Nombre, "UQ__Roles__75E3EFCFF4C85C20").IsUnique();

            entity.Property(e => e.Descripcion).HasMaxLength(200);
            entity.Property(e => e.FechaCreacion).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Nombre).HasMaxLength(50);
        });

        modelBuilder.Entity<Sala>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Salas__3214EC079F7A8CE3");

            entity.HasIndex(e => e.Nombre, "UQ__Salas__75E3EFCFD741BECD").IsUnique();

            entity.Property(e => e.Activa).HasDefaultValue(true);
            entity.Property(e => e.Descripcion).HasMaxLength(500);
            entity.Property(e => e.Nombre).HasMaxLength(100);
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Usuarios__3214EC07B2DCF98E");

            entity.HasIndex(e => e.Email, "IX_Usuarios_Email");

            entity.HasIndex(e => e.Email, "UQ__Usuarios__A9D10534C733AE39").IsUnique();

            entity.HasIndex(e => e.DocumentoIdentidad, "UX_Usuarios_DocumentoIdentidad")
                .IsUnique()
                .HasFilter("([DocumentoIdentidad] IS NOT NULL)");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.Apellido).HasMaxLength(100);
            entity.Property(e => e.DocumentoIdentidad).HasMaxLength(20);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.FechaRegistro).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Nombre).HasMaxLength(100);
            entity.Property(e => e.Telefono).HasMaxLength(20);

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdRol)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_Roles");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

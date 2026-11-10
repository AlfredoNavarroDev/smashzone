using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Usuario
{
    public Guid Id { get; set; }

    public int IdRol { get; set; }

    public string Nombre { get; set; } = null!;

    public string Apellido { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? DocumentoIdentidad { get; set; }

    public bool Activo { get; set; }

    public DateTime? FechaRegistro { get; set; }

    public virtual ICollection<HistorialEstadosReserva> HistorialEstadosReservas { get; set; } = new List<HistorialEstadosReserva>();

    public virtual Role IdRolNavigation { get; set; } = null!;

    public virtual ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();
}

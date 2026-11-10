using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Reserva
{
    public Guid Id { get; set; }

    public Guid IdCliente { get; set; }

    public int IdSala { get; set; }

    public int IdPaquete { get; set; }

    public int IdEstado { get; set; }

    public DateTime FechaHoraInicio { get; set; }

    public DateTime FechaHoraFin { get; set; }

    public int NumParticipantes { get; set; }

    public decimal MontoPaquete { get; set; }

    public decimal MontoExtras { get; set; }

    public decimal? MontoTotal { get; set; }

    public string? NotasEspeciales { get; set; }

    public DateTime? FechaCreacion { get; set; }

    public virtual ICollection<DetallesReservaExtra> DetallesReservaExtras { get; set; } = new List<DetallesReservaExtra>();

    public virtual ExencionesResponsabilidad? ExencionesResponsabilidad { get; set; }

    public virtual ICollection<HistorialEstadosReserva> HistorialEstadosReservas { get; set; } = new List<HistorialEstadosReserva>();

    public virtual Usuario IdClienteNavigation { get; set; } = null!;

    public virtual EstadosReserva IdEstadoNavigation { get; set; } = null!;

    public virtual Paquete IdPaqueteNavigation { get; set; } = null!;

    public virtual Sala IdSalaNavigation { get; set; } = null!;

    public virtual ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}

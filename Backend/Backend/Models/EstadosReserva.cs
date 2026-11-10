using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class EstadosReserva
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<HistorialEstadosReserva> HistorialEstadosReservaIdEstadoAnteriorNavigations { get; set; } = new List<HistorialEstadosReserva>();

    public virtual ICollection<HistorialEstadosReserva> HistorialEstadosReservaIdEstadoNuevoNavigations { get; set; } = new List<HistorialEstadosReserva>();

    public virtual ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();
}

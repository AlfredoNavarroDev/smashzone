using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Sala
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int CapacidadMaxima { get; set; }

    public string? Descripcion { get; set; }

    public bool Activa { get; set; }

    public virtual ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();
}

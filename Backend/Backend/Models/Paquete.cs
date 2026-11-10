using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Paquete
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string Descripcion { get; set; } = null!;

    public decimal Precio { get; set; }

    public int DuracionMinutos { get; set; }

    public int MaxParticipantes { get; set; }

    public int CantidadItemsEstandar { get; set; }

    public bool Activo { get; set; }

    public virtual ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();
}

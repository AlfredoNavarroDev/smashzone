using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class ExencionesResponsabilidad
{
    public int Id { get; set; }

    public Guid IdReserva { get; set; }

    public bool Firmado { get; set; }

    public DateTime? FechaFirma { get; set; }

    public string? EnlaceDocumentoPdf { get; set; }

    public virtual Reserva IdReservaNavigation { get; set; } = null!;
}

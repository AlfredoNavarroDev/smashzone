using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public class CrearSalaValidator : AbstractValidator<CrearSalaDTO>
{
    public CrearSalaValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CapacidadMaxima).GreaterThan(0);
        RuleFor(x => x.Descripcion).MaximumLength(500);
    }
}

public class ActualizarSalaValidator : AbstractValidator<ActualizarSalaDTO>
{
    public ActualizarSalaValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CapacidadMaxima).GreaterThan(0);
        RuleFor(x => x.Descripcion).MaximumLength(500);
    }
}

public class CrearPaqueteValidator : AbstractValidator<CrearPaqueteDTO>
{
    public CrearPaqueteValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Descripcion).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Precio).GreaterThan(0);
        RuleFor(x => x.DuracionMinutos).GreaterThan(0);
        RuleFor(x => x.MaxParticipantes).GreaterThanOrEqualTo(1);
        RuleFor(x => x.CantidadItemsEstandar).GreaterThanOrEqualTo(0);
    }
}

public class ActualizarPaqueteValidator : AbstractValidator<ActualizarPaqueteDTO>
{
    public ActualizarPaqueteValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Descripcion).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Precio).GreaterThan(0);
        RuleFor(x => x.DuracionMinutos).GreaterThan(0);
        RuleFor(x => x.MaxParticipantes).GreaterThanOrEqualTo(1);
        RuleFor(x => x.CantidadItemsEstandar).GreaterThanOrEqualTo(0);
    }
}

public class CrearItemExtraValidator : AbstractValidator<CrearItemExtraDTO>
{
    public CrearItemExtraValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Categoria).NotEmpty().MaximumLength(50);
        RuleFor(x => x.PrecioUnitario).GreaterThanOrEqualTo(0);
        RuleFor(x => x.StockDisponible).GreaterThanOrEqualTo(0);
    }
}

public class ActualizarItemExtraValidator : AbstractValidator<ActualizarItemExtraDTO>
{
    public ActualizarItemExtraValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Categoria).NotEmpty().MaximumLength(50);
        RuleFor(x => x.PrecioUnitario).GreaterThanOrEqualTo(0);
        RuleFor(x => x.StockDisponible).GreaterThanOrEqualTo(0);
    }
}

using AutoMapper;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Mapping;

public class ReservaProfile : Profile
{
    public ReservaProfile()
    {
        CreateMap<Reserva, ReservaDetalleDTO>()
            .ForMember(d => d.Sala, o => o.MapFrom(s => s.IdSalaNavigation.Nombre))
            .ForMember(d => d.Paquete, o => o.MapFrom(s => s.IdPaqueteNavigation.Nombre))
            .ForMember(d => d.Estado, o => o.MapFrom(s => s.IdEstadoNavigation.Nombre))
            .ForMember(d => d.MontoTotal, o => o.MapFrom(s => s.MontoPaquete + s.MontoExtras))
            .ForMember(d => d.Extras, o => o.MapFrom(s => s.DetallesReservaExtras));

        CreateMap<DetallesReservaExtra, DetalleExtraDTO>()
            .ForMember(d => d.ItemExtra, o => o.MapFrom(s => s.IdItemExtraNavigation.Nombre))
            .ForMember(d => d.Subtotal, o => o.MapFrom(s => s.Cantidad * s.PrecioUnitarioHistorico));

        CreateMap<HistorialEstadosReserva, HistorialEstadoDTO>()
            .ForMember(d => d.EstadoAnterior, o => o.MapFrom(s => s.IdEstadoAnteriorNavigation != null ? s.IdEstadoAnteriorNavigation.Nombre : null))
            .ForMember(d => d.EstadoNuevo, o => o.MapFrom(s => s.IdEstadoNuevoNavigation.Nombre))
            .ForMember(d => d.UsuarioCambio, o => o.MapFrom(s =>
                s.IdUsuarioCambioNavigation != null ? s.IdUsuarioCambioNavigation.Nombre + " " + s.IdUsuarioCambioNavigation.Apellido : null));
    }
}

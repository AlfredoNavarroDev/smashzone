using AutoMapper;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Mapping;

public class CatalogoProfile : Profile
{
    public CatalogoProfile()
    {
        CreateMap<Sala, SalaDTO>();
        CreateMap<Paquete, PaqueteDTO>();
        CreateMap<ItemsExtra, ItemExtraDTO>();
    }
}

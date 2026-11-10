using AutoMapper;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Mapping;

public class UsuarioProfile : Profile
{
    public UsuarioProfile()
    {
        CreateMap<Usuario, UsuarioDTO>()
            .ForMember(d => d.Rol, o => o.MapFrom(s => s.IdRolNavigation.Nombre));
        CreateMap<Role, RolDTO>();
    }
}

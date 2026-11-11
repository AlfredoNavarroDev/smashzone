namespace Backend.DTOs;

public record IngresoMesDTO(int Anio, int Mes, decimal TotalIngresos);
public record PaqueteDemandaDTO(int IdPaquete, string Paquete, int TotalReservas);
public record HoraPicoDTO(int Hora, int TotalReservas);

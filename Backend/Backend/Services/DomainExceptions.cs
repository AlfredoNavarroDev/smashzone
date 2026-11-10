namespace Backend.Services;

/// <summary>Excepciones de dominio; el middleware las traduce a códigos HTTP.</summary>
public abstract class DomainException(string message) : Exception(message);

public class ReglaNegocioException(string message) : DomainException(message);   // 400
public class NoAutorizadoException(string message) : DomainException(message);   // 401
public class NoEncontradoException(string message) : DomainException(message);   // 404
public class ConflictoException(string message) : DomainException(message);      // 409

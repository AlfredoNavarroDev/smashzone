namespace Backend.Configuration;

public class JwtSettings
{
    public const string Section = "JwtSettings";

    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "SmashZone";
    public string Audience { get; set; } = "SmashZoneClient";
    public int ExpirationMinutes { get; set; } = 60;
}

namespace BGAUSS.Api.Settings;

/// <summary>
/// Bound from appsettings.json → "SmtpSettings"
/// </summary>
public class SmtpSettings
{
    public string Host        { get; set; } = "";
    public int    Port        { get; set; } = 587;
    public bool   EnableSsl   { get; set; } = true;
    public string Username    { get; set; } = "";
    public string Password    { get; set; } = "";
    public string FromEmail   { get; set; } = "";
    public string FromName    { get; set; } = "BGAUSS Parts Catalog";
    public string AdminEmail1 { get; set; } = "";
    public string AdminEmail2 { get; set; } = "";
}
namespace BGAUSS.Api.DTOs;
public class ContactFormDto
{
    public string? Subject     { get; set; }
    public string? Salutation  { get; set; }
    public string? FirstName   { get; set; }
    public string? LastName    { get; set; }
    public string? Company     { get; set; }
    public string? Email       { get; set; } = "";
    public string? Phone       { get; set; }
    public string? Message     { get; set; } = "";
    // recipients field from frontend is ignored — we always use the two fixed addresses
    public List<string>? Recipients { get; set; }
}

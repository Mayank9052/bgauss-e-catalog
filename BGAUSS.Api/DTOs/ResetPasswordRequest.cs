namespace BGAUSS.Api.Models;

public class ResetPasswordRequest
{
    public string? Username { get; set; }
    public string? Token { get; set; }
    public string? NewPassword { get; set; }
}
namespace BGAUSS.Api.DTOs
{
    public class CreateUserDto
    {
        public required string Username { get; set; }
        public required string Password { get; set; }
        public string? Role { get; set; }
    }
}
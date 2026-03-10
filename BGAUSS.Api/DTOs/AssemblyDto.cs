namespace BGAUSS.Api.DTOs
{
    public class AssemblyDto
    {
        public int Id { get; set; }
        public string? AssemblyName { get; set; }
        public string? ImagePath { get; set; }
        public int? ModelId { get; set; } // Include ModelId for filtering
    }
}
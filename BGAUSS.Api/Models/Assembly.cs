using System.ComponentModel.DataAnnotations;

namespace BGAUSS.Api.Models
{
    public class Assembly
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string AssemblyName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ImageNo { get; set; }

        public ICollection<AssemblyPart> AssemblyParts { get; set; } = new List<AssemblyPart>();
    }
}
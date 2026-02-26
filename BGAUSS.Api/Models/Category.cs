using System.Text.Json.Serialization;

namespace BGAUSS.Api.Models;

public class Category
{
    public int Id { get; set; }

    public string? CategoryName { get; set; }

    [JsonIgnore]   // 🔥 IMPORTANT
    public ICollection<Part>? Parts { get; set; }
}
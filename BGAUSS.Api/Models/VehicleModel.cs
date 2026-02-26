using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BGAUSS.Api.Models;

public class VehicleModel
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string ModelName { get; set; } = string.Empty;

    public ICollection<VehicleVariant>? Variants { get; set; }
    public ICollection<Vehicle>? Vehicles { get; set; }
    public ICollection<ModelPart>? ModelParts { get; set; }
}
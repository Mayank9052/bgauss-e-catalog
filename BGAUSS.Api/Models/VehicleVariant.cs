using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public class VehicleVariant
{
    public int Id { get; set; }

    public string? VariantName { get; set; }

    public int ModelId { get; set; }
    public VehicleModel? Model { get; set; }

    public ICollection<Vehicle>? Vehicles { get; set; }
    public ICollection<ModelPart>? ModelParts { get; set; }
}
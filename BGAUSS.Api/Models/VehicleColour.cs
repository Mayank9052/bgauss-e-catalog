using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public class VehicleColour
{
    public int Id { get; set; }

    public string? ColourName { get; set; }

    public ICollection<Vehicle>? Vehicles { get; set; }
    public ICollection<ModelPart>? ModelParts { get; set; }
}
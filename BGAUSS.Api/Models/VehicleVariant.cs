using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class VehicleVariant
{
    public int Id { get; set; }

    public string? VariantName { get; set; }

    public int? ModelId { get; set; }

    public virtual VehicleModel? Model { get; set; }

    public virtual ICollection<ModelPart> ModelParts { get; set; } = new List<ModelPart>();

    public virtual ICollection<Part> Parts { get; set; } = new List<Part>();

    public virtual ICollection<VehicleColour> VehicleColours { get; set; } = new List<VehicleColour>();

    public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}

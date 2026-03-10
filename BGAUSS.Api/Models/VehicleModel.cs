using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class VehicleModel
{
    public int Id { get; set; }

    public string ModelName { get; set; } = null!;

    public virtual ICollection<ModelPart> ModelParts { get; set; } = new List<ModelPart>();

    public virtual ICollection<VehicleColour> VehicleColours { get; set; } = new List<VehicleColour>();

    public virtual ICollection<VehicleVariant> VehicleVariants { get; set; } = new List<VehicleVariant>();

    public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}

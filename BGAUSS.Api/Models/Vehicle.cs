using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class Vehicle
{
    public int Id { get; set; }

    public string? Vin { get; set; }

    public int? ModelId { get; set; }

    public int? VariantId { get; set; }

    public int? ColourId { get; set; }

    public virtual VehicleColour? Colour { get; set; }

    public virtual VehicleModel? Model { get; set; }

    public virtual VehicleVariant? Variant { get; set; }
}

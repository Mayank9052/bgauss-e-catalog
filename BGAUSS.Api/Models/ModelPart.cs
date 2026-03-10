using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class ModelPart
{
    public int Id { get; set; }

    public int? ModelId { get; set; }

    public int? VariantId { get; set; }

    public int? ColourId { get; set; }

    public int? PartId { get; set; }

    public virtual VehicleModel? Model { get; set; }

    public virtual Part? Part { get; set; }

    public virtual VehicleVariant? Variant { get; set; }
}

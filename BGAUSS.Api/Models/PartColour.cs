using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class PartColour
{
    public int Id { get; set; }

    public int PartId { get; set; }

    public int ColourId { get; set; }

    public virtual VehicleColour Colour { get; set; } = null!;

    public virtual Part Part { get; set; } = null!;
}

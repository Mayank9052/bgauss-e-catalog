using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;
public class PartColour
{
    public int Id { get; set; }

    public int PartId { get; set; }
    public int ColourId { get; set; }

    public Part Part { get; set; }
    public VehicleColour Colour { get; set; }
}
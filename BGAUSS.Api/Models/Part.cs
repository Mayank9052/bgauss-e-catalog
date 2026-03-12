using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class Part
{
    public int Id { get; set; }

    public string? PartNumber { get; set; }

    public string? PartName { get; set; }

    public string? Description { get; set; }
    public string? Remarks { get; set; }

    public decimal? Price { get; set; }

    public decimal? Bdp { get; set; }

    public decimal? Mrp { get; set; }

    public decimal? TaxPercent { get; set; }

    public int StockQuantity { get; set; }

    public int? AssemblyId { get; set; }

    public int? ModelId { get; set; }

    public int? VariantId { get; set; }

    public int? ColourId { get; set; }

    public decimal? TorqueNm { get; set; }

    public virtual Assembly? Assembly { get; set; }

    public virtual ICollection<AssemblyPart> AssemblyParts { get; set; } = new List<AssemblyPart>();

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual VehicleColour? Colour { get; set; }

    public virtual ICollection<ModelPart> ModelParts { get; set; } = new List<ModelPart>();

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<PartColour> PartColours { get; set; } = new List<PartColour>();

    public virtual ICollection<PartImage> PartImages { get; set; } = new List<PartImage>();

    public virtual VehicleVariant? Variant { get; set; }
}

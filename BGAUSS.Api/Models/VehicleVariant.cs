using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

public partial class VehicleVariant
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string? VariantName { get; set; }

    public int? ModelId { get; set; }

    [InverseProperty("Variant")]
    public virtual ICollection<Assembly> Assemblies { get; set; } = new List<Assembly>();

    [ForeignKey("ModelId")]
    [InverseProperty("VehicleVariants")]
    public virtual VehicleModel? Model { get; set; }

    [InverseProperty("Variant")]
    public virtual ICollection<ModelPart> ModelParts { get; set; } = new List<ModelPart>();

    [InverseProperty("Variant")]
    public virtual ICollection<Part> Parts { get; set; } = new List<Part>();

    [InverseProperty("Variant")]
    public virtual ICollection<VehicleColour> VehicleColours { get; set; } = new List<VehicleColour>();

    [InverseProperty("Variant")]
    public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

public partial class VehicleModel
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string ModelName { get; set; } = null!;

    [InverseProperty("Model")]
    public virtual ICollection<Assembly> Assemblies { get; set; } = new List<Assembly>();

    [InverseProperty("Model")]
    public virtual ICollection<ModelPart> ModelParts { get; set; } = new List<ModelPart>();

    [InverseProperty("Model")]
    public virtual ICollection<VehicleColour> VehicleColours { get; set; } = new List<VehicleColour>();

    [InverseProperty("Model")]
    public virtual ICollection<VehicleVariant> VehicleVariants { get; set; } = new List<VehicleVariant>();

    [InverseProperty("Model")]
    public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

[Index("ModelId", "VariantId", Name = "IX_Assemblies_ModelId_VariantId")]
public partial class Assembly
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string? AssemblyName { get; set; }

    [StringLength(500)]
    public string? ImagePath { get; set; }

    public int? ModelId { get; set; }

    public int? VariantId { get; set; }

    [InverseProperty("Assembly")]
    public virtual ICollection<AssemblyPart> AssemblyParts { get; set; } = new List<AssemblyPart>();

    [ForeignKey("ModelId")]
    [InverseProperty("Assemblies")]
    public virtual VehicleModel? Model { get; set; }

    [InverseProperty("Assembly")]
    public virtual ICollection<Part> Parts { get; set; } = new List<Part>();

    [ForeignKey("VariantId")]
    [InverseProperty("Assemblies")]
    public virtual VehicleVariant? Variant { get; set; }
}

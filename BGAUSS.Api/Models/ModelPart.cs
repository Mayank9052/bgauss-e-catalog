using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

public partial class ModelPart
{
    [Key]
    public int Id { get; set; }

    public int? ModelId { get; set; }

    public int? VariantId { get; set; }

    public int? ColourId { get; set; }

    public int? PartId { get; set; }

    [ForeignKey("ModelId")]
    [InverseProperty("ModelParts")]
    public virtual VehicleModel? Model { get; set; }

    [ForeignKey("PartId")]
    [InverseProperty("ModelParts")]
    public virtual Part? Part { get; set; }

    [ForeignKey("VariantId")]
    [InverseProperty("ModelParts")]
    public virtual VehicleVariant? Variant { get; set; }
}

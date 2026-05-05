using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

[Index("Vin", Name = "UQ__Vehicles__C5DF234CE5B828D8", IsUnique = true)]
public partial class Vehicle
{
    [Key]
    public int Id { get; set; }

    [Column("VIN")]
    [StringLength(17)]
    public string? Vin { get; set; }

    public int? ModelId { get; set; }

    public int? VariantId { get; set; }

    public int? ColourId { get; set; }

    [ForeignKey("ColourId")]
    [InverseProperty("Vehicles")]
    public virtual VehicleColour? Colour { get; set; }

    [ForeignKey("ModelId")]
    [InverseProperty("Vehicles")]
    public virtual VehicleModel? Model { get; set; }

    [ForeignKey("VariantId")]
    [InverseProperty("Vehicles")]
    public virtual VehicleVariant? Variant { get; set; }
}

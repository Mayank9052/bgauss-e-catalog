using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

public partial class AssemblyPart
{
    [Key]
    public int Id { get; set; }

    public int? AssemblyId { get; set; }

    public int? PartId { get; set; }

    public int? Quantity { get; set; }

    [Column("FRT")]
    [StringLength(50)]
    public string? Frt { get; set; }

    [StringLength(500)]
    public string? Remark { get; set; }

    [Column("ERP")]
    [StringLength(100)]
    public string? Erp { get; set; }

    [ForeignKey("AssemblyId")]
    [InverseProperty("AssemblyParts")]
    public virtual Assembly? Assembly { get; set; }

    [ForeignKey("PartId")]
    [InverseProperty("AssemblyParts")]
    public virtual Part? Part { get; set; }
}

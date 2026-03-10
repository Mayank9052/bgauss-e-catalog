using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class AssemblyPart
{
    public int Id { get; set; }

    public int? AssemblyId { get; set; }

    public int? PartId { get; set; }

    public int? Quantity { get; set; }

    public string? Frt { get; set; }

    public string? Remark { get; set; }

    public string? Erp { get; set; }

    public virtual Assembly? Assembly { get; set; }

    public virtual Part? Part { get; set; }
}

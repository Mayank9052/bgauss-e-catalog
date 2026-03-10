using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class PartImage
{
    public int Id { get; set; }

    public int? PartId { get; set; }

    public string? ImagePath { get; set; }

    public virtual Part? Part { get; set; }
}

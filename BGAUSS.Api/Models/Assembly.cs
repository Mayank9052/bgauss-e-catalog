using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class Assembly
{
    public int Id { get; set; }

    public string? AssemblyName { get; set; }

    public string? ImagePath { get; set; }

    public virtual ICollection<AssemblyPart> AssemblyParts { get; set; } = new List<AssemblyPart>();

    public virtual ICollection<Part> Parts { get; set; } = new List<Part>();
}

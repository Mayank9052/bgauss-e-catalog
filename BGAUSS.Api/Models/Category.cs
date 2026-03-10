using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class Category
{
    public int Id { get; set; }

    public string? CategoryName { get; set; }

    public virtual ICollection<Part> Parts { get; set; } = new List<Part>();
}

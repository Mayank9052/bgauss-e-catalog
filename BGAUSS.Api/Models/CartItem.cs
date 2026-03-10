using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class CartItem
{
    public int Id { get; set; }

    public int CartId { get; set; }

    public int PartId { get; set; }

    public int Quantity { get; set; }

    public DateTime? AddedAt { get; set; }

    public virtual Cart Cart { get; set; } = null!;

    public virtual Part Part { get; set; } = null!;
}

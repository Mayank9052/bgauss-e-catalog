using System;
using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public partial class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public int PartId { get; set; }

    public int Quantity { get; set; }

    public decimal Price { get; set; }

    public decimal SubTotal { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual Part Part { get; set; } = null!;
}

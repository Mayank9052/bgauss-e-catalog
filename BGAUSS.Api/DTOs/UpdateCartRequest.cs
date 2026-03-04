namespace BGAUSS.Api.DTOs;

public class UpdateCartRequest
{
    public int CartId { get; set; }
    public List<UpdateCartItemDto>? Items { get; set; }
}

public class UpdateCartItemDto
{
    public int CartItemId { get; set; }
    public int Quantity { get; set; }
}


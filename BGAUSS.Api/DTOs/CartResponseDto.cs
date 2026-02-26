namespace BGAUSS.Api.DTOs;

public class CartResponseDto
{
    public int CartId { get; set; }
    public List<CartItemDto>? Items { get; set; }
    public decimal TotalAmount { get; set; }
}

public class CartItemDto
{
    public int CartItemId { get; set; }
    public string? PartName { get; set; }
    public string? PartNumber { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public decimal SubTotal { get; set; }
}
namespace BGAUSS.Api.DTOs;

public class AddToCartRequest
{
    public int UserId { get; set; }
    public int PartId { get; set; }
    public int Quantity { get; set; }
}
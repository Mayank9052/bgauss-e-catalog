namespace BGAUSS.Api.DTOs;

public class PartResponse
{
    public int Id { get; set; }
    public string? PartNumber { get; set; }
    public string? PartName { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImagePath { get; set; }
    public string? CategoryName { get; set; }
}
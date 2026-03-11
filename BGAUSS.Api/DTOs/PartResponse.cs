namespace BGAUSS.Api.DTOs;

public class PartResponse
{
    public int Id { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string PartName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public decimal Bdp { get; set; }
    public decimal Mrp { get; set; }
    public decimal TaxPercent { get; set; }
    public int StockQuantity { get; set; }

    public string ImagePath { get; set; } = string.Empty;
}

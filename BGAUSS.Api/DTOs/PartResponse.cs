namespace BGAUSS.Api.DTOs;

public class PartResponse
{
    public int Id { get; set; }
    public string PartNumber { get; set; } = "";
    public string PartName { get; set; } = "";
    public string Description { get; set; } = "";
    public string Remarks { get; set; } = "";
    public decimal Price { get; set; }
    public decimal Bdp { get; set; }
    public decimal Mrp { get; set; }
    public decimal TaxPercent { get; set; }
    public int StockQuantity { get; set; }
    public int? AssemblyId { get; set; }
    public int? ModelId { get; set; }
    public int? VariantId { get; set; }
    public decimal TorqueNm { get; set; }
    public string ImageNumber { get; set; } = "";
    public string ColourIds { get; set; } = ""; 
    public string ImagePath { get; set; } = "";
}


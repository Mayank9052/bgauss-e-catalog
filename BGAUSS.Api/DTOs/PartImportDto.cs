namespace BGAUSS.Api.DTOs;

public class PartImportDto
{
    public string? PartNumber { get; set; }
    public string? PartName { get; set; }
    public string? Description { get; set; }
    public decimal BDP { get; set; }
    public decimal MRP { get; set; }
    public decimal TaxPercent { get; set; }
    public string? PageReference { get; set; }
}
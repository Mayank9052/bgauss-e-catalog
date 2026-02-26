namespace BGAUSS.Api.Models;

public class PartImage
{
    public int Id { get; set; }

    public int PartId { get; set; }
    public Part? Part { get; set; }

    public string? ImagePath { get; set; }
}
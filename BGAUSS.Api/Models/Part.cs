using System.Collections.Generic;

namespace BGAUSS.Api.Models;

public class Part
{
    public int Id { get; set; }

    public string? PartNumber { get; set; }
    public string? PartName { get; set; }
    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImagePath { get; set; }

    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    public ICollection<ModelPart>? ModelParts { get; set; }
    public ICollection<PartImage>? PartImages { get; set; }
}
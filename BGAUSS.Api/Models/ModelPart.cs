namespace BGAUSS.Api.Models;

public class ModelPart
{
    public int Id { get; set; }

    public int ModelId { get; set; }
    public VehicleModel? Model { get; set; }

    public int VariantId { get; set; }
    public VehicleVariant? Variant { get; set; }

    public int? ColourId { get; set; }
    public VehicleColour? Colour { get; set; }

    public int PartId { get; set; }
    public Part? Part { get; set; }
}
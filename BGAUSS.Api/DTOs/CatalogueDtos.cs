namespace BGAUSS.Api.DTOs;

/// <summary>PATCH body for activating / deactivating a catalogue record.</summary>
public class StatusUpdateDto
{
    public bool IsActive { get; set; }
}

/// <summary>PUT body for the individual part image (relative path returned by /api/upload/image).</summary>
public class PartImageUpdateDto
{
    public string? ImagePath { get; set; }
}

/// <summary>A clickable callout on an assembly drawing. Coordinates are normalised 0..1.</summary>
public class AssemblyHotspotDto
{
    public int?    Id         { get; set; }
    public string  Label      { get; set; } = "";
    public int     PageNumber { get; set; } = 1;
    public double  X          { get; set; }
    public double  Y          { get; set; }
    public double  Width      { get; set; }
    public double  Height     { get; set; }
}

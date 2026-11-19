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

public class ColourMatrixDto
{
    public int Id { get; set; }
    public int ModelId { get; set; }
    public string? ModelName { get; set; }
    public int? VariantId { get; set; }
    public string? VariantName { get; set; }
    public int? ColourId { get; set; }
    public string? ColourName { get; set; }
    public string Title { get; set; } = "";
    public string OriginalFileName { get; set; } = "";
    public string FileType { get; set; } = "";
    public long FileSize { get; set; }
    public bool IsActive { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? UploadedBy { get; set; }
}

/// <summary>Multipart form for uploading / editing a colour matrix.</summary>
public class ColourMatrixFormDto
{
    public int ModelId { get; set; }
    public int? VariantId { get; set; }
    public int? ColourId { get; set; }
    public string? Title { get; set; }
    public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
}

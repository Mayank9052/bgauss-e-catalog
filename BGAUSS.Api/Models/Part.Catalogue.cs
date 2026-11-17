using System.ComponentModel.DataAnnotations.Schema;

namespace BGAUSS.Api.Models;

public partial class Part
{
    /// <summary>
    /// Comma-separated colour IDs sent by the admin UI on create/update.
    /// Not stored on the Parts table — it is synchronised into PartColours.
    /// </summary>
    [NotMapped]
    public string? ColourIds { get; set; }
}

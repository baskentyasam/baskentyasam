using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

[Table("devices")]
public class Device
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string LocationType { get; set; } = "library"; // library | parking | cafeteria

    [MaxLength(100)]
    public string? LocationKey { get; set; }

    [Required]
    [MaxLength(200)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime? LastSeenAt { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

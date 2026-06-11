using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

[Table("device_configs")]
public class DeviceConfig
{
    [Key]
    [MaxLength(64)]
    public string DeviceId { get; set; } = string.Empty;

    [Required]
    public string LineJson { get; set; } = "[427,0,427,480]";

    [Required]
    [MaxLength(20)]
    public string Mode { get; set; } = "person";

    public bool FlipDirection { get; set; }

    public string? RoiJson { get; set; }

    public int ConfigVersion { get; set; } = 1;

    public bool SnapshotRequested { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

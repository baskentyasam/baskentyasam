using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

[Table("device_snapshots")]
public class DeviceSnapshot
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(64)]
    public string DeviceId { get; set; } = string.Empty;

    [Required]
    public byte[] JpegData { get; set; } = Array.Empty<byte>();

    public int Width { get; set; }

    public int Height { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

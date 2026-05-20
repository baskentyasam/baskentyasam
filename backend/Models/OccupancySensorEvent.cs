using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

/// <summary>
/// Görüntü işleme / sensör sisteminden gelen ham giriş-çıkış olayı.
/// Belirli bir zaman penceresinde kaç kişinin girdiği ve çıktığı bilgisini taşır.
/// </summary>
[Table("OccupancySensorEvents")]
public class OccupancySensorEvent
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string ZoneName { get; set; } = string.Empty;

    /// <summary>Pencerenin başlangıç zamanı.</summary>
    [Required]
    public DateTime FromTime { get; set; }

    /// <summary>Pencerenin bitiş zamanı.</summary>
    [Required]
    public DateTime ToTime { get; set; }

    /// <summary>Pencere içinde içeri giren kişi sayısı.</summary>
    [Required]
    public int InCount { get; set; }

    /// <summary>Pencere içinde dışarı çıkan kişi sayısı.</summary>
    [Required]
    public int OutCount { get; set; }

    /// <summary>Sunucunun event'i aldığı zaman.</summary>
    [Required]
    public DateTime ReceivedAt { get; set; }
}

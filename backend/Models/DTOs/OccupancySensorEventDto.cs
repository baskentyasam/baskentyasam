using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ApiProject.Models.DTOs;

/// <summary>
/// Görüntü işleme sisteminden gelen delta (giriş-çıkış) verisi.
/// Beklenen JSON:
/// { "zoneName": "kutuphane", "from": "...", "in": 2, "out": 1, "to": "..." }
/// zoneName alanı opsiyoneldir; gönderilmezse "kutuphane" varsayılır.
/// </summary>
public class OccupancySensorEventDto
{
    [JsonPropertyName("zoneName")]
    [MaxLength(100)]
    public string? ZoneName { get; set; }

    [Required(ErrorMessage = "from alanı gereklidir")]
    [JsonPropertyName("from")]
    public DateTime From { get; set; }

    [Required(ErrorMessage = "to alanı gereklidir")]
    [JsonPropertyName("to")]
    public DateTime To { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "in 0 veya pozitif olmalıdır")]
    [JsonPropertyName("in")]
    public int In { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "out 0 veya pozitif olmalıdır")]
    [JsonPropertyName("out")]
    public int Out { get; set; }
}

using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

// Pi -> Backend
public class DeviceEventDto
{
    [Range(0, 10000)] public int In { get; set; }
    [Range(0, 10000)] public int Out { get; set; }
}

// Backend -> Pi (config polling response)
public class DeviceConfigResponseDto
{
    public int[] Line { get; set; } = Array.Empty<int>();
    public string Mode { get; set; } = "person";
    public bool FlipDirection { get; set; }
    public RoiDto? Roi { get; set; }
    public int ConfigVersion { get; set; }
    public bool SnapshotRequested { get; set; }
}

public class RoiDto
{
    public bool Enabled { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

// Admin -> Backend (config update)
public class DeviceConfigUpdateDto
{
    [Required] public int[] Line { get; set; } = Array.Empty<int>();
    [Required] [RegularExpression("^(person|vehicle)$")] public string Mode { get; set; } = "person";
    public bool FlipDirection { get; set; }
    public RoiDto? Roi { get; set; }
}

// Admin tarafında cihaz listesi
public class DeviceListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LocationType { get; set; } = string.Empty;
    public string? LocationKey { get; set; }
    public bool IsActive { get; set; }
    public bool IsOnline { get; set; }                // son 60 saniyede ping varsa
    public DateTime? LastSeenAt { get; set; }
    public int ConfigVersion { get; set; }
}

// Admin tarafında cihaz detayı
public class DeviceDetailDto
{
    public DeviceListItemDto Device { get; set; } = new();
    public DeviceConfigResponseDto Config { get; set; } = new();
    public DateTime? LatestSnapshotAt { get; set; }
}

// Admin -> Backend (yeni cihaz)
public class CreateDeviceDto
{
    [Required] [MaxLength(64)] public string Id { get; set; } = string.Empty;
    [Required] [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] [RegularExpression("^(library|parking)$")] public string LocationType { get; set; } = "library";
    [MaxLength(100)] public string? LocationKey { get; set; }
}

// Cihaz oluşturma yanıtı: token sadece bu yanıtta plain döner
public class CreateDeviceResponseDto
{
    public DeviceListItemDto Device { get; set; } = new();
    public string PlainToken { get; set; } = string.Empty;
}

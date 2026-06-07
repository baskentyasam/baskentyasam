using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

public class LibraryFloorDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int MaxCapacity { get; set; }
    public bool IsOpen { get; set; }
    public int SortOrder { get; set; }
}

public class LibraryOccupancySnapshotDto
{
    public int CurrentOccupancy { get; set; }
    public int OpenCapacity { get; set; }
    public int AvailableSlots { get; set; }
    public int OccupancyRate { get; set; }
    public DateTime? LastUpdatedAt { get; set; }
    public string ScheduleMode { get; set; } = "normal";
    public string ScheduleDescription { get; set; } = string.Empty;
    public List<LibraryFloorDto> Floors { get; set; } = new();
}

public class LibraryAdminOverviewDto : LibraryOccupancySnapshotDto
{
    public List<string> ExamOpenFloorCodes { get; set; } = new();
}

public class UpdateLibraryScheduleModeDto
{
    [Required]
    [MaxLength(20)]
    public string ScheduleMode { get; set; } = string.Empty;
}

public class UpdateLibraryExamFloorsDto
{
    [Required]
    public List<string> OpenFloorCodes { get; set; } = new();
}

public class UpdateLibraryOpenFloorsDto
{
    [Required]
    public List<string> OpenFloorCodes { get; set; } = new();
}

public class UpdateLibraryFloorCapacityDto
{
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public int MaxCapacity { get; set; }
}

public class UpdateLibraryCapacitiesDto
{
    [Required]
    public List<UpdateLibraryFloorCapacityDto> Floors { get; set; } = new();
}

public class UpdateLibraryOccupancyDto
{
    [Required]
    public int CurrentOccupancy { get; set; }
}

// Eski alan tabanlı DTO'lar — geriye dönük uyumluluk için tutuluyor.
public class UpsertLibraryAreaDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Location { get; set; }

    [Required]
    public int Capacity { get; set; }

    [Required]
    public int CurrentOccupancy { get; set; }

    public bool IsActive { get; set; } = true;
}

public class UpdateLibraryMetricsDto
{
    [Required]
    public int Capacity { get; set; }

    [Required]
    public int CurrentOccupancy { get; set; }
}

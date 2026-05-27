using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

public class UpsertParkingLotDto
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

public class UpdateParkingMetricsDto
{
    [Required]
    public int Capacity { get; set; }

    [Required]
    public int CurrentOccupancy { get; set; }
}

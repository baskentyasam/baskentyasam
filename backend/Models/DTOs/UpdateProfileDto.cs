using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

public class UpdateProfileDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    public string? ProfileImage { get; set; }

    [MaxLength(200)]
    public string? Faculty { get; set; }

    [MaxLength(200)]
    public string? Department { get; set; }

    [MaxLength(50)]
    public string? RoomNumber { get; set; }

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(20)]
    public string? ClassLevel { get; set; }

    public string? Courses { get; set; }

    [MaxLength(50)]
    public string? StudentNo { get; set; }
}

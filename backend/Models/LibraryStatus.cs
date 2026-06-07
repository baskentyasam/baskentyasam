using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

[Table("library_status")]
public class LibraryStatus
{
    [Key]
    public int Id { get; set; } = 1;

    [Required]
    public int CurrentOccupancy { get; set; }

    [Required]
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(20)]
    public string ScheduleMode { get; set; } = "normal";

    public string? ExamOpenFloorCodesJson { get; set; }
}

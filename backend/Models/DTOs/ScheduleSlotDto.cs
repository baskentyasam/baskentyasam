namespace ApiProject.Models.DTOs;

/// <summary>Kaydetme isteği: slot anahtarı + ders kodu.</summary>
public class ScheduleCellDto
{
    public string Slot { get; set; } = string.Empty; // Format: "Pzt-09.00-09.50"
    public string? CourseCode { get; set; }
}

public class SaveScheduleDto
{
    public List<ScheduleCellDto> Slots { get; set; } = new();
}

/// <summary>Öğrenci / detay: müsaitlik + isteğe bağlı ders kodu.</summary>
public class ScheduleSlotResponseDto
{
    public int Id { get; set; }
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string? CourseCode { get; set; }
    public string Slot { get; set; } = string.Empty;
}

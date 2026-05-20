using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public class ScheduleService
{
    private static readonly Dictionary<int, string> DayNumToAbbrev = new()
    {
        { 1, "Pzt" },
        { 2, "Sal" },
        { 3, "Çar" },
        { 4, "Per" },
        { 5, "Cum" }
    };

    private readonly AppDbContext _context;

    public ScheduleService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>Öğretim elemanı kendi programı: yalnızca slot + ders kodu.</summary>
    public async Task<List<ScheduleCellDto>> GetMyScheduleAsync(string email)
    {
        var instructor = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower().Trim() == email.ToLower().Trim() && u.Role == UserRole.Teacher);

        if (instructor == null)
            return new List<ScheduleCellDto>();

        var schedules = await _context.InstructorSchedules
            .Where(s => s.InstructorId == instructor.Id)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        return schedules.Select(s => new ScheduleCellDto
        {
            Slot = ToSlotLabel(s),
            CourseCode = s.CourseCode
        }).ToList();
    }

    public async Task SaveScheduleAsync(int instructorId, SaveScheduleDto dto)
    {
        var existingSchedules = await _context.InstructorSchedules
            .Where(s => s.InstructorId == instructorId)
            .ToListAsync();
        _context.InstructorSchedules.RemoveRange(existingSchedules);

        var dayMap = new Dictionary<string, int>
        {
            { "Pzt", 1 },
            { "Sal", 2 },
            { "Çar", 3 },
            { "Per", 4 },
            { "Cum", 5 }
        };

        var newSchedules = new List<InstructorSchedule>();

        foreach (var cell in dto.Slots)
        {
            var parts = cell.Slot.Split('-');
            if (parts.Length < 2)
                continue;

            var dayName = parts[0];
            var timeStr = parts[1].Replace(".", ":");

            if (!TimeSpan.TryParse(timeStr, out var startTime))
            {
                var timeParts = parts[1].Split('.');
                if (timeParts.Length == 2 && int.TryParse(timeParts[0], out var hours) && int.TryParse(timeParts[1], out var minutes))
                    startTime = new TimeSpan(hours, minutes, 0);
                else
                    continue;
            }

            if (!dayMap.TryGetValue(dayName, out var dayOfWeek))
                continue;

            var courseCode = string.IsNullOrWhiteSpace(cell.CourseCode)
                ? null
                : cell.CourseCode.Trim();

            newSchedules.Add(new InstructorSchedule
            {
                InstructorId = instructorId,
                DayOfWeek = dayOfWeek,
                StartTime = startTime,
                CourseCode = courseCode
            });
        }

        await _context.InstructorSchedules.AddRangeAsync(newSchedules);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ScheduleSlotResponseDto>> GetScheduleByInstructorIdAsync(int instructorId)
    {
        var schedules = await _context.InstructorSchedules
            .Where(s => s.InstructorId == instructorId)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        return schedules.Select(schedule => new ScheduleSlotResponseDto
        {
            Id = schedule.Id,
            DayOfWeek = schedule.DayOfWeek,
            StartTime = schedule.StartTime.ToString(@"hh\:mm"),
            CourseCode = schedule.CourseCode,
            Slot = ToSlotLabel(schedule)
        }).ToList();
    }

    private static string ToSlotLabel(InstructorSchedule schedule)
    {
        var dayName = DayNumToAbbrev.GetValueOrDefault(schedule.DayOfWeek, "");
        var timeStr = schedule.StartTime.ToString(@"hh\.mm");
        var endTime = schedule.StartTime.Add(TimeSpan.FromMinutes(50));
        var endTimeStr = endTime.ToString(@"hh\.mm");
        return $"{dayName}-{timeStr}-{endTimeStr}";
    }

    public async Task<bool> IsTimeSlotAvailableAsync(int instructorId, DateTime date, TimeSpan time)
    {
        var dayOfWeek = (int)date.DayOfWeek;

        if (dayOfWeek == 0 || dayOfWeek == 6)
            return false;

        var daySchedule = await _context.InstructorSchedules
            .Where(s => s.InstructorId == instructorId && s.DayOfWeek == dayOfWeek)
            .ToListAsync();

        var appointmentStart = time;
        var appointmentEnd = time.Add(TimeSpan.FromMinutes(30));

        foreach (var course in daySchedule)
        {
            var courseStart = course.StartTime;
            var courseEnd = course.StartTime.Add(TimeSpan.FromMinutes(50));

            if (appointmentStart < courseEnd && appointmentEnd > courseStart)
                return false;
        }

        return true;
    }
}

using ApiProject.Models;

namespace ApiProject.Services;

public static class LibraryScheduleModes
{
    public const string Manual = "manual";
    public const string Normal = "normal";
    public const string Exam = "exam";
}

public static class LibraryScheduleResolver
{
    private static readonly string[] AllFloorCodes = ["minus1", "ground", "floor1", "floor2", "h24"];
    private static readonly string[] EveningFloorCodes = ["ground", "h24"];
    private static readonly string[] NightFloorCodes = ["h24"];

    public static TimeZoneInfo TurkeyTimeZone
    {
        get
        {
            if (TimeZoneInfo.TryFindSystemTimeZoneById("Europe/Istanbul", out var istanbul))
            {
                return istanbul;
            }

            if (TimeZoneInfo.TryFindSystemTimeZoneById("Turkey Standard Time", out var turkey))
            {
                return turkey;
            }

            return TimeZoneInfo.CreateCustomTimeZone(
                "Turkey",
                TimeSpan.FromHours(3),
                "Turkey",
                "Turkey");
        }
    }

    public static HashSet<string> ResolveOpenFloorCodes(
        string scheduleMode,
        IReadOnlyList<string>? examOpenFloorCodes,
        IReadOnlyList<LibraryFloor> floors,
        DateTime? utcNow = null)
    {
        var normalizedMode = NormalizeMode(scheduleMode);

        if (normalizedMode == LibraryScheduleModes.Manual)
        {
            return floors
                .Where(f => f.IsOpen)
                .Select(f => f.Code.ToLowerInvariant())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        if (normalizedMode == LibraryScheduleModes.Exam)
        {
            var examCodes = examOpenFloorCodes is { Count: > 0 }
                ? examOpenFloorCodes
                : AllFloorCodes;

            return examCodes
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim().ToLowerInvariant())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        var localTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow ?? DateTime.UtcNow, TurkeyTimeZone).TimeOfDay;

        if (localTime >= TimeSpan.FromHours(22))
        {
            return NightFloorCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        if (localTime >= TimeSpan.FromHours(17))
        {
            return EveningFloorCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        return AllFloorCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public static string GetScheduleDescription(string scheduleMode, DateTime? utcNow = null)
    {
        var normalizedMode = NormalizeMode(scheduleMode);

        if (normalizedMode == LibraryScheduleModes.Manual)
        {
            return "Manuel mod: açık katlar yönetici tarafından işaretlenir.";
        }

        if (normalizedMode == LibraryScheduleModes.Exam)
        {
            return "Sınav dönemi modu: seçilen katlar gün boyu açık kalır.";
        }

        var localTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow ?? DateTime.UtcNow, TurkeyTimeZone).TimeOfDay;

        if (localTime >= TimeSpan.FromHours(22))
        {
            return "Normal mod (22:00 sonrası): yalnızca 7/24 Alanı açık.";
        }

        if (localTime >= TimeSpan.FromHours(17))
        {
            return "Normal mod (17:00–22:00): Giriş Kat ve 7/24 Alanı açık.";
        }

        return "Normal mod (17:00 öncesi): tüm katlar açık.";
    }

    public static string NormalizeMode(string? scheduleMode)
    {
        var mode = scheduleMode?.Trim().ToLowerInvariant();
        return mode switch
        {
            LibraryScheduleModes.Manual => LibraryScheduleModes.Manual,
            LibraryScheduleModes.Exam => LibraryScheduleModes.Exam,
            _ => LibraryScheduleModes.Normal,
        };
    }

    public static bool IsValidMode(string? scheduleMode)
    {
        var mode = scheduleMode?.Trim().ToLowerInvariant();
        return mode is LibraryScheduleModes.Manual or LibraryScheduleModes.Normal or LibraryScheduleModes.Exam;
    }
}

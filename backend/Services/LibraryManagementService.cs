using System.Text.Json;
using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface ILibraryManagementService
{
    Task<LibraryAdminOverviewDto> GetOverviewAsync();
    Task<LibraryOccupancySnapshotDto> GetPublicSnapshotAsync();
    Task<LibraryAdminOverviewDto> UpdateOpenFloorsAsync(IReadOnlyList<string> openFloorCodes);
    Task<LibraryAdminOverviewDto> UpdateCapacitiesAsync(IReadOnlyList<UpdateLibraryFloorCapacityDto> floors);
    Task<LibraryAdminOverviewDto> UpdateOccupancyAsync(int currentOccupancy);
    Task<LibraryAdminOverviewDto> UpdateScheduleModeAsync(string scheduleMode);
    Task<LibraryAdminOverviewDto> UpdateExamOpenFloorsAsync(IReadOnlyList<string> openFloorCodes);
}

public class LibraryManagementService : ILibraryManagementService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly AppDbContext _context;
    private readonly IOccupancyLogService _occupancyLogs;

    public LibraryManagementService(AppDbContext context, IOccupancyLogService occupancyLogs)
    {
        _context = context;
        _occupancyLogs = occupancyLogs;
    }

    public async Task<LibraryAdminOverviewDto> GetOverviewAsync()
    {
        await EnsureSeededAsync();
        var floors = await GetOrderedFloorsAsync();
        var status = await GetStatusAsync();
        return BuildOverview(floors, status);
    }

    public async Task<LibraryOccupancySnapshotDto> GetPublicSnapshotAsync()
    {
        await EnsureSeededAsync();
        var floors = await GetOrderedFloorsAsync();
        var status = await GetStatusAsync();
        return BuildSnapshot(floors, status);
    }

    public async Task<LibraryAdminOverviewDto> UpdateOpenFloorsAsync(IReadOnlyList<string> openFloorCodes)
    {
        await EnsureSeededAsync();
        var floors = await GetOrderedFloorsAsync();
        var normalized = openFloorCodes
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToLowerInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var floor in floors)
        {
            floor.IsOpen = normalized.Contains(floor.Code.ToLowerInvariant());
        }

        var status = await GetStatusAsync();
        status.ScheduleMode = LibraryScheduleModes.Manual;
        await _context.SaveChangesAsync();
        return BuildOverview(floors, status);
    }

    public async Task<LibraryAdminOverviewDto> UpdateCapacitiesAsync(
        IReadOnlyList<UpdateLibraryFloorCapacityDto> floorsInput)
    {
        await EnsureSeededAsync();
        var floors = await GetOrderedFloorsAsync();
        var byCode = floorsInput.ToDictionary(
            f => f.Code.Trim().ToLowerInvariant(),
            f => Math.Max(f.MaxCapacity, 0),
            StringComparer.OrdinalIgnoreCase);

        foreach (var floor in floors)
        {
            if (byCode.TryGetValue(floor.Code.ToLowerInvariant(), out var capacity))
            {
                floor.MaxCapacity = capacity;
            }
        }

        await _context.SaveChangesAsync();
        var status = await GetStatusAsync();
        return BuildOverview(floors, status);
    }

    public async Task<LibraryAdminOverviewDto> UpdateOccupancyAsync(int currentOccupancy)
    {
        await EnsureSeededAsync();
        var status = await GetStatusAsync();
        status.CurrentOccupancy = Math.Max(currentOccupancy, 0);
        status.LastUpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var floors = await GetOrderedFloorsAsync();
        var overview = BuildOverview(floors, status);

        // Tüm güncellemeler (camera push, manuel admin) tek bir log yoluna düşer
        await _occupancyLogs.AppendAsync("library-main", overview.CurrentOccupancy, overview.OpenCapacity);

        return overview;
    }

    public async Task<LibraryAdminOverviewDto> UpdateScheduleModeAsync(string scheduleMode)
    {
        if (!LibraryScheduleResolver.IsValidMode(scheduleMode))
        {
            throw new InvalidOperationException("Geçersiz çalışma modu. manual, normal veya exam olmalıdır.");
        }

        await EnsureSeededAsync();
        var floors = await GetOrderedFloorsAsync();
        var status = await GetStatusAsync();
        var normalizedMode = LibraryScheduleResolver.NormalizeMode(scheduleMode);

        if (normalizedMode == LibraryScheduleModes.Manual)
        {
            var effectiveCodes = LibraryScheduleResolver.ResolveOpenFloorCodes(
                status.ScheduleMode,
                DeserializeExamCodes(status.ExamOpenFloorCodesJson),
                floors);

            foreach (var floor in floors)
            {
                floor.IsOpen = effectiveCodes.Contains(floor.Code.ToLowerInvariant());
            }
        }
        else if (normalizedMode == LibraryScheduleModes.Exam && string.IsNullOrWhiteSpace(status.ExamOpenFloorCodesJson))
        {
            status.ExamOpenFloorCodesJson = SerializeExamCodes(LibraryFloorSeed.DefaultFloorCodes());
        }

        status.ScheduleMode = normalizedMode;
        await _context.SaveChangesAsync();
        return BuildOverview(floors, status);
    }

    public async Task<LibraryAdminOverviewDto> UpdateExamOpenFloorsAsync(IReadOnlyList<string> openFloorCodes)
    {
        await EnsureSeededAsync();
        var floors = await GetOrderedFloorsAsync();
        var status = await GetStatusAsync();

        if (LibraryScheduleResolver.NormalizeMode(status.ScheduleMode) != LibraryScheduleModes.Exam)
        {
            throw new InvalidOperationException("Sınav katları yalnızca exam modunda güncellenebilir.");
        }

        var validCodes = floors.Select(f => f.Code.ToLowerInvariant()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var normalized = openFloorCodes
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToLowerInvariant())
            .Where(validCodes.Contains)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalized.Count == 0)
        {
            throw new InvalidOperationException("En az bir geçerli kat seçilmelidir.");
        }

        status.ExamOpenFloorCodesJson = SerializeExamCodes(normalized);
        await _context.SaveChangesAsync();
        return BuildOverview(floors, status);
    }

    private async Task<List<LibraryFloor>> GetOrderedFloorsAsync()
    {
        return await _context.LibraryFloors
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Id)
            .ToListAsync();
    }

    private async Task<LibraryStatus> GetStatusAsync()
    {
        var status = await _context.LibraryStatuses.FindAsync(1);
        if (status == null)
        {
            status = new LibraryStatus
            {
                Id = 1,
                CurrentOccupancy = 0,
                LastUpdatedAt = DateTime.UtcNow,
                ScheduleMode = LibraryScheduleModes.Normal,
            };
            _context.LibraryStatuses.Add(status);
            await _context.SaveChangesAsync();
        }

        if (string.IsNullOrWhiteSpace(status.ScheduleMode))
        {
            status.ScheduleMode = LibraryScheduleModes.Normal;
            await _context.SaveChangesAsync();
        }

        return status;
    }

    private async Task EnsureSeededAsync()
    {
        if (await _context.LibraryFloors.AnyAsync())
        {
            return;
        }

        var legacyOccupancy = await _context.LibraryAreas
            .Where(a => a.IsActive)
            .Select(a => (int?)a.CurrentOccupancy)
            .FirstOrDefaultAsync() ?? 0;

        _context.LibraryFloors.AddRange(LibraryFloorSeed.DefaultFloors());
        _context.LibraryStatuses.Add(new LibraryStatus
        {
            Id = 1,
            CurrentOccupancy = legacyOccupancy,
            LastUpdatedAt = DateTime.UtcNow,
            ScheduleMode = LibraryScheduleModes.Normal,
            ExamOpenFloorCodesJson = SerializeExamCodes(LibraryFloorSeed.DefaultFloorCodes()),
        });
        await _context.SaveChangesAsync();
    }

    internal static int CalculateOpenCapacity(IEnumerable<LibraryFloor> floors) =>
        floors.Where(f => f.IsOpen).Sum(f => f.MaxCapacity);

    internal static int CalculateOccupancyRate(int occupancy, int openCapacity)
    {
        if (openCapacity <= 0)
        {
            return 0;
        }

        return Math.Min(100, Math.Max(0, (int)Math.Round(occupancy * 100.0 / openCapacity)));
    }

    private LibraryAdminOverviewDto BuildOverview(IReadOnlyList<LibraryFloor> floors, LibraryStatus status)
    {
        var snapshot = BuildSnapshot(floors, status);
        return new LibraryAdminOverviewDto
        {
            CurrentOccupancy = snapshot.CurrentOccupancy,
            OpenCapacity = snapshot.OpenCapacity,
            AvailableSlots = snapshot.AvailableSlots,
            OccupancyRate = snapshot.OccupancyRate,
            LastUpdatedAt = snapshot.LastUpdatedAt,
            ScheduleMode = snapshot.ScheduleMode,
            ScheduleDescription = snapshot.ScheduleDescription,
            Floors = snapshot.Floors,
            ExamOpenFloorCodes = DeserializeExamCodes(status.ExamOpenFloorCodesJson),
        };
    }

    private LibraryOccupancySnapshotDto BuildSnapshot(IReadOnlyList<LibraryFloor> floors, LibraryStatus status)
    {
        var examCodes = DeserializeExamCodes(status.ExamOpenFloorCodesJson);
        var effectiveOpenCodes = LibraryScheduleResolver.ResolveOpenFloorCodes(
            status.ScheduleMode,
            examCodes,
            floors);

        var effectiveFloors = floors
            .Select(floor => new LibraryFloor
            {
                Id = floor.Id,
                Code = floor.Code,
                Name = floor.Name,
                MaxCapacity = floor.MaxCapacity,
                SortOrder = floor.SortOrder,
                IsOpen = effectiveOpenCodes.Contains(floor.Code.ToLowerInvariant()),
            })
            .ToList();

        var openCapacity = CalculateOpenCapacity(effectiveFloors);
        var rate = CalculateOccupancyRate(status.CurrentOccupancy, openCapacity);

        return new LibraryOccupancySnapshotDto
        {
            CurrentOccupancy = status.CurrentOccupancy,
            OpenCapacity = openCapacity,
            AvailableSlots = Math.Max(openCapacity - status.CurrentOccupancy, 0),
            OccupancyRate = rate,
            LastUpdatedAt = status.LastUpdatedAt,
            ScheduleMode = LibraryScheduleResolver.NormalizeMode(status.ScheduleMode),
            ScheduleDescription = LibraryScheduleResolver.GetScheduleDescription(status.ScheduleMode),
            Floors = effectiveFloors.Select(MapFloor).ToList(),
        };
    }

    private static LibraryFloorDto MapFloor(LibraryFloor floor) => new()
    {
        Id = floor.Id,
        Code = floor.Code,
        Name = floor.Name,
        MaxCapacity = floor.MaxCapacity,
        IsOpen = floor.IsOpen,
        SortOrder = floor.SortOrder,
    };

    private static List<string> DeserializeExamCodes(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return LibraryFloorSeed.DefaultFloorCodes();
        }

        try
        {
            var codes = JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
            return codes?
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
                ?? LibraryFloorSeed.DefaultFloorCodes();
        }
        catch
        {
            return LibraryFloorSeed.DefaultFloorCodes();
        }
    }

    private static string SerializeExamCodes(IEnumerable<string> codes) =>
        JsonSerializer.Serialize(
            codes
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList(),
            JsonOptions);
}

public static class LibraryFloorSeed
{
    public static IEnumerable<LibraryFloor> DefaultFloors() =>
    [
        new LibraryFloor { Code = "minus1", Name = "-1. Kat", MaxCapacity = 60, IsOpen = true, SortOrder = 1 },
        new LibraryFloor { Code = "ground", Name = "Giriş Kat", MaxCapacity = 80, IsOpen = true, SortOrder = 2 },
        new LibraryFloor { Code = "floor1", Name = "1. Kat", MaxCapacity = 100, IsOpen = true, SortOrder = 3 },
        new LibraryFloor { Code = "floor2", Name = "2. Kat", MaxCapacity = 90, IsOpen = true, SortOrder = 4 },
        new LibraryFloor { Code = "h24", Name = "7/24 Alanı", MaxCapacity = 120, IsOpen = true, SortOrder = 5 },
    ];

    public static List<string> DefaultFloorCodes() =>
        DefaultFloors().Select(f => f.Code).ToList();
}

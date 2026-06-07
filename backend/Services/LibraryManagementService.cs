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
}

public class LibraryManagementService : ILibraryManagementService
{
    private readonly AppDbContext _context;

    public LibraryManagementService(AppDbContext context)
    {
        _context = context;
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

        await _context.SaveChangesAsync();
        var status = await GetStatusAsync();
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
            status = new LibraryStatus { Id = 1, CurrentOccupancy = 0, LastUpdatedAt = DateTime.UtcNow };
            _context.LibraryStatuses.Add(status);
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

    private static LibraryAdminOverviewDto BuildOverview(IReadOnlyList<LibraryFloor> floors, LibraryStatus status)
    {
        var openCapacity = CalculateOpenCapacity(floors);
        var rate = CalculateOccupancyRate(status.CurrentOccupancy, openCapacity);

        return new LibraryAdminOverviewDto
        {
            CurrentOccupancy = status.CurrentOccupancy,
            OpenCapacity = openCapacity,
            AvailableSlots = Math.Max(openCapacity - status.CurrentOccupancy, 0),
            OccupancyRate = rate,
            LastUpdatedAt = status.LastUpdatedAt,
            Floors = floors.Select(MapFloor).ToList(),
        };
    }

    private static LibraryOccupancySnapshotDto BuildSnapshot(IReadOnlyList<LibraryFloor> floors, LibraryStatus status)
    {
        var openCapacity = CalculateOpenCapacity(floors);
        var rate = CalculateOccupancyRate(status.CurrentOccupancy, openCapacity);

        return new LibraryOccupancySnapshotDto
        {
            CurrentOccupancy = status.CurrentOccupancy,
            OpenCapacity = openCapacity,
            AvailableSlots = Math.Max(openCapacity - status.CurrentOccupancy, 0),
            OccupancyRate = rate,
            LastUpdatedAt = status.LastUpdatedAt,
            Floors = floors.Select(MapFloor).ToList(),
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
}

using System.Security.Cryptography;
using System.Text.Json;
using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IDeviceService
{
    Task<Device?> AuthenticateAsync(string deviceId, string token);
    Task TouchLastSeenAsync(string deviceId);
    Task<DeviceConfigResponseDto> GetConfigForDeviceAsync(string deviceId);
    Task<int> ApplyEventAsync(string deviceId, int delIn, int delOut);
    Task SaveSnapshotAsync(string deviceId, byte[] jpegData, int width, int height);
    Task<DeviceSnapshot?> GetLatestSnapshotAsync(string deviceId);

    Task<List<DeviceListItemDto>> ListAsync();
    Task<DeviceDetailDto?> GetAsync(string deviceId);
    Task<CreateDeviceResponseDto> CreateAsync(CreateDeviceDto dto);
    Task<DeviceConfigResponseDto> UpdateConfigAsync(string deviceId, DeviceConfigUpdateDto dto);
    Task RequestSnapshotAsync(string deviceId);
    Task<string?> RegenerateTokenAsync(string deviceId);
}

public class DeviceService : IDeviceService
{
    private readonly AppDbContext _context;
    private readonly ILibraryManagementService _libraryService;
    private readonly IOccupancyLogService _occupancyLogs;
    private readonly ILogger<DeviceService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public DeviceService(AppDbContext context, ILibraryManagementService libraryService, IOccupancyLogService occupancyLogs, ILogger<DeviceService> logger)
    {
        _context = context;
        _libraryService = libraryService;
        _occupancyLogs = occupancyLogs;
        _logger = logger;
    }

    public async Task<Device?> AuthenticateAsync(string deviceId, string token)
    {
        if (string.IsNullOrWhiteSpace(deviceId) || string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.IsActive);
        if (device == null)
        {
            return null;
        }

        try
        {
            if (BCrypt.Net.BCrypt.Verify(token, device.TokenHash))
            {
                return device;
            }
        }
        catch
        {
            // hash bozuksa false dön
        }

        return null;
    }

    public async Task TouchLastSeenAsync(string deviceId)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
        if (device != null)
        {
            device.LastSeenAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<DeviceConfigResponseDto> GetConfigForDeviceAsync(string deviceId)
    {
        var config = await EnsureConfigAsync(deviceId);
        return MapConfig(config);
    }

    public async Task<int> ApplyEventAsync(string deviceId, int delIn, int delOut)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
        if (device == null) return 0;

        if (device.LocationType == "library")
        {
            var snapshot = await _libraryService.GetPublicSnapshotAsync();
            var newOccupancy = Math.Max(0, snapshot.CurrentOccupancy + delIn - delOut);
            // LibraryManagementService.UpdateOccupancyAsync log'u kendi yazar.
            var updated = await _libraryService.UpdateOccupancyAsync(newOccupancy);
            return updated.CurrentOccupancy;
        }

        if (device.LocationType == "parking")
        {
            if (!int.TryParse(device.LocationKey, out var lotId))
            {
                _logger.LogWarning("Parking cihaz {DeviceId} LocationKey integer değil: {Key}", deviceId, device.LocationKey);
                return 0;
            }
            var lot = await _context.ParkingLots.FirstOrDefaultAsync(p => p.Id == lotId);
            if (lot == null) return 0;

            var newOccupancy = Math.Max(0, lot.CurrentOccupancy + delIn - delOut);
            if (lot.Capacity > 0) newOccupancy = Math.Min(newOccupancy, lot.Capacity);
            lot.CurrentOccupancy = newOccupancy;
            await _context.SaveChangesAsync();
            await _occupancyLogs.AppendAsync($"parking-{lot.Id}", lot.CurrentOccupancy, lot.Capacity);
            return lot.CurrentOccupancy;
        }

        // cafeteria veya başka tip — şimdilik no-op.
        return 0;
    }

    public async Task SaveSnapshotAsync(string deviceId, byte[] jpegData, int width, int height)
    {
        _context.DeviceSnapshots.Add(new DeviceSnapshot
        {
            DeviceId = deviceId,
            JpegData = jpegData,
            Width = width,
            Height = height,
            CreatedAt = DateTime.UtcNow,
        });

        // snapshot_requested flag'ini kapat
        var config = await EnsureConfigAsync(deviceId);
        config.SnapshotRequested = false;
        await _context.SaveChangesAsync();

        // Eski snapshot'ları temizle (her cihaz için en son 5'i tut)
        var stale = await _context.DeviceSnapshots
            .Where(s => s.DeviceId == deviceId)
            .OrderByDescending(s => s.CreatedAt)
            .Skip(5)
            .ToListAsync();
        if (stale.Count > 0)
        {
            _context.DeviceSnapshots.RemoveRange(stale);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<DeviceSnapshot?> GetLatestSnapshotAsync(string deviceId)
    {
        return await _context.DeviceSnapshots
            .Where(s => s.DeviceId == deviceId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<List<DeviceListItemDto>> ListAsync()
    {
        var devices = await _context.Devices.OrderBy(d => d.Id).ToListAsync();
        var configs = await _context.DeviceConfigs.ToDictionaryAsync(c => c.DeviceId, c => c);
        var onlineThreshold = DateTime.UtcNow.AddSeconds(-60);

        return devices.Select(d => new DeviceListItemDto
        {
            Id = d.Id,
            Name = d.Name,
            LocationType = d.LocationType,
            LocationKey = d.LocationKey,
            IsActive = d.IsActive,
            IsOnline = d.LastSeenAt.HasValue && d.LastSeenAt.Value >= onlineThreshold,
            LastSeenAt = d.LastSeenAt,
            ConfigVersion = configs.TryGetValue(d.Id, out var c) ? c.ConfigVersion : 0,
        }).ToList();
    }

    public async Task<DeviceDetailDto?> GetAsync(string deviceId)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
        if (device == null) return null;
        var config = await EnsureConfigAsync(deviceId);
        var latestSnapshot = await _context.DeviceSnapshots
            .Where(s => s.DeviceId == deviceId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        var onlineThreshold = DateTime.UtcNow.AddSeconds(-60);
        return new DeviceDetailDto
        {
            Device = new DeviceListItemDto
            {
                Id = device.Id,
                Name = device.Name,
                LocationType = device.LocationType,
                LocationKey = device.LocationKey,
                IsActive = device.IsActive,
                IsOnline = device.LastSeenAt.HasValue && device.LastSeenAt.Value >= onlineThreshold,
                LastSeenAt = device.LastSeenAt,
                ConfigVersion = config.ConfigVersion,
            },
            Config = MapConfig(config),
            LatestSnapshotAt = latestSnapshot?.CreatedAt,
        };
    }

    public async Task<CreateDeviceResponseDto> CreateAsync(CreateDeviceDto dto)
    {
        if (await _context.Devices.AnyAsync(d => d.Id == dto.Id))
        {
            throw new InvalidOperationException($"Cihaz ID '{dto.Id}' zaten kullanımda.");
        }

        var plainToken = GenerateToken();
        var device = new Device
        {
            Id = dto.Id,
            Name = dto.Name,
            LocationType = dto.LocationType,
            LocationKey = dto.LocationKey,
            TokenHash = BCrypt.Net.BCrypt.HashPassword(plainToken),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        var config = new DeviceConfig
        {
            DeviceId = dto.Id,
            LineJson = "[427,0,427,480]",
            Mode = "person",
            FlipDirection = false,
            ConfigVersion = 1,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Devices.Add(device);
        _context.DeviceConfigs.Add(config);
        await _context.SaveChangesAsync();

        return new CreateDeviceResponseDto
        {
            Device = new DeviceListItemDto
            {
                Id = device.Id,
                Name = device.Name,
                LocationType = device.LocationType,
                LocationKey = device.LocationKey,
                IsActive = true,
                IsOnline = false,
                LastSeenAt = null,
                ConfigVersion = 1,
            },
            PlainToken = plainToken,
        };
    }

    public async Task<DeviceConfigResponseDto> UpdateConfigAsync(string deviceId, DeviceConfigUpdateDto dto)
    {
        var config = await EnsureConfigAsync(deviceId);
        config.LineJson = JsonSerializer.Serialize(dto.Line);
        config.Mode = dto.Mode;
        config.FlipDirection = dto.FlipDirection;
        config.RoiJson = dto.Roi != null ? JsonSerializer.Serialize(dto.Roi, JsonOpts) : null;
        config.ConfigVersion += 1;
        config.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapConfig(config);
    }

    public async Task RequestSnapshotAsync(string deviceId)
    {
        var config = await EnsureConfigAsync(deviceId);
        config.SnapshotRequested = true;
        config.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<string?> RegenerateTokenAsync(string deviceId)
    {
        var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
        if (device == null) return null;
        var plainToken = GenerateToken();
        device.TokenHash = BCrypt.Net.BCrypt.HashPassword(plainToken);
        await _context.SaveChangesAsync();
        return plainToken;
    }

    private async Task<DeviceConfig> EnsureConfigAsync(string deviceId)
    {
        var config = await _context.DeviceConfigs.FirstOrDefaultAsync(c => c.DeviceId == deviceId);
        if (config == null)
        {
            config = new DeviceConfig
            {
                DeviceId = deviceId,
                LineJson = "[427,0,427,480]",
                Mode = "person",
                ConfigVersion = 1,
                UpdatedAt = DateTime.UtcNow,
            };
            _context.DeviceConfigs.Add(config);
            await _context.SaveChangesAsync();
        }
        return config;
    }

    private static DeviceConfigResponseDto MapConfig(DeviceConfig config)
    {
        int[] line;
        try
        {
            line = JsonSerializer.Deserialize<int[]>(config.LineJson) ?? new[] { 427, 0, 427, 480 };
        }
        catch
        {
            line = new[] { 427, 0, 427, 480 };
        }

        RoiDto? roi = null;
        if (!string.IsNullOrWhiteSpace(config.RoiJson))
        {
            try
            {
                roi = JsonSerializer.Deserialize<RoiDto>(config.RoiJson, JsonOpts);
            }
            catch
            {
                roi = null;
            }
        }

        return new DeviceConfigResponseDto
        {
            Line = line,
            Mode = config.Mode,
            FlipDirection = config.FlipDirection,
            Roi = roi,
            ConfigVersion = config.ConfigVersion,
            SnapshotRequested = config.SnapshotRequested,
        };
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(20);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

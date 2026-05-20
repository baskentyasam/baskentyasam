using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IOccupancyService
{
    Task<OccupancyLog?> GetLatestOccupancyAsync(string zoneName);
    /// <summary>
    /// Görüntü işleme sensöründen gelen delta (in/out) verisini işler.
    /// Ham olayı kaydeder, son doluluğu okur, +in -out ile günceller ve
    /// yeni anlık doluluğu OccupancyLogs'a yazar.
    /// </summary>
    Task<OccupancyLog> ProcessSensorEventAsync(OccupancySensorEventDto dto);
}

public class OccupancyService : IOccupancyService
{
    private static readonly Dictionary<string, int> ZoneCapacities = new()
    {
        { "kutuphane", 1627 }
    };

    private readonly AppDbContext _context;

    public OccupancyService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OccupancyLog?> GetLatestOccupancyAsync(string zoneName)
    {
        return await _context.OccupancyLogs
            .Where(o => o.ZoneName == zoneName)
            .OrderByDescending(o => o.LogTime)
            .FirstOrDefaultAsync();
    }

    public async Task<OccupancyLog> ProcessSensorEventAsync(OccupancySensorEventDto dto)
    {
        var zoneName = string.IsNullOrWhiteSpace(dto.ZoneName) ? "kutuphane" : dto.ZoneName.Trim();

        if (!ZoneCapacities.TryGetValue(zoneName, out var capacity))
            throw new ArgumentException($"Tanımsız bölge: {zoneName}");

        // 1) Ham sensör event'i kaydet (audit/historik için)
        var sensorEvent = new OccupancySensorEvent
        {
            ZoneName = zoneName,
            FromTime = dto.From,
            ToTime = dto.To,
            InCount = Math.Max(0, dto.In),
            OutCount = Math.Max(0, dto.Out),
            ReceivedAt = DateTime.Now
        };
        _context.OccupancySensorEvents.Add(sensorEvent);

        // 2) Mevcut son doluluğu oku
        var lastLog = await _context.OccupancyLogs
            .Where(o => o.ZoneName == zoneName)
            .OrderByDescending(o => o.LogTime)
            .FirstOrDefaultAsync();

        var previousCount = lastLog?.Count ?? 0;

        // 3) Yeni doluluk = önceki + in - out (negatif olamaz, kapasiteyi de aşmasın)
        var newCount = previousCount + sensorEvent.InCount - sensorEvent.OutCount;
        if (newCount < 0) newCount = 0;
        if (newCount > capacity) newCount = capacity;

        var log = new OccupancyLog
        {
            ZoneName = zoneName,
            Count = newCount,
            Capacity = capacity,
            LogTime = DateTime.Now
        };
        _context.OccupancyLogs.Add(log);

        await _context.SaveChangesAsync();
        return log;
    }
}

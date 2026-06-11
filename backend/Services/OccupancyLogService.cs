using ApiProject.Data;
using ApiProject.Models;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IOccupancyLogService
{
    Task AppendAsync(string zoneName, int count, int capacity);
    Task<List<OccupancyLog>> GetRecentAsync(string zoneName, int hours);
    Task<List<OccupancySeriesPoint>> GetSeriesAsync(string zoneName, int hours, int bucketMinutes);
    Task PruneAsync(int retentionDays);
}

public class OccupancySeriesPoint
{
    public DateTime BucketStart { get; set; }
    public int AvgCount { get; set; }
    public int MaxCount { get; set; }
    public int Capacity { get; set; }
}

public class OccupancyLogService : IOccupancyLogService
{
    private readonly AppDbContext _context;

    public OccupancyLogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task AppendAsync(string zoneName, int count, int capacity)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddSeconds(-60);
        var recent = await _context.OccupancyLogs
            .Where(l => l.ZoneName == zoneName && l.LogTime >= cutoff)
            .OrderByDescending(l => l.LogTime)
            .FirstOrDefaultAsync();

        if (recent != null)
        {
            recent.Count = count;
            recent.Capacity = capacity;
            recent.LogTime = now;
        }
        else
        {
            _context.OccupancyLogs.Add(new OccupancyLog
            {
                ZoneName = zoneName,
                Count = count,
                Capacity = capacity,
                LogTime = now,
            });
        }
        await _context.SaveChangesAsync();
    }

    public async Task<List<OccupancyLog>> GetRecentAsync(string zoneName, int hours)
    {
        var since = DateTime.UtcNow.AddHours(-hours);
        return await _context.OccupancyLogs
            .Where(l => l.ZoneName == zoneName && l.LogTime >= since)
            .OrderBy(l => l.LogTime)
            .ToListAsync();
    }

    public async Task<List<OccupancySeriesPoint>> GetSeriesAsync(string zoneName, int hours, int bucketMinutes)
    {
        if (bucketMinutes < 1) bucketMinutes = 1;
        var since = DateTime.UtcNow.AddHours(-hours);

        // Raw SQL ile date_trunc + GROUP BY (PostgreSQL)
        var bucketInterval = $"{bucketMinutes} minutes";
        var sql = $@"
            SELECT
                to_timestamp(floor(extract(epoch from log_time) / ({bucketMinutes} * 60)) * ({bucketMinutes} * 60))
                    AT TIME ZONE 'UTC' AS bucket_start,
                CAST(ROUND(AVG(count)) AS integer) AS avg_count,
                MAX(count) AS max_count,
                MAX(capacity) AS capacity
            FROM occupancy_logs
            WHERE zone_name = {{0}} AND log_time >= {{1}}
            GROUP BY bucket_start
            ORDER BY bucket_start
        ";

        var conn = _context.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $@"
                SELECT
                    to_timestamp(floor(extract(epoch from log_time) / ({bucketMinutes} * 60)) * ({bucketMinutes} * 60))
                        AT TIME ZONE 'UTC' AS bucket_start,
                    CAST(ROUND(AVG(count)) AS integer) AS avg_count,
                    MAX(count) AS max_count,
                    MAX(capacity) AS capacity
                FROM occupancy_logs
                WHERE zone_name = @zone AND log_time >= @since
                GROUP BY bucket_start
                ORDER BY bucket_start";

            var zoneParam = cmd.CreateParameter();
            zoneParam.ParameterName = "@zone";
            zoneParam.Value = zoneName;
            cmd.Parameters.Add(zoneParam);

            var sinceParam = cmd.CreateParameter();
            sinceParam.ParameterName = "@since";
            sinceParam.Value = since;
            cmd.Parameters.Add(sinceParam);

            var result = new List<OccupancySeriesPoint>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new OccupancySeriesPoint
                {
                    BucketStart = reader.GetDateTime(0),
                    AvgCount = reader.GetInt32(1),
                    MaxCount = reader.GetInt32(2),
                    Capacity = reader.GetInt32(3),
                });
            }
            return result;
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    public async Task PruneAsync(int retentionDays)
    {
        var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
        await _context.Database.ExecuteSqlRawAsync(
            "DELETE FROM occupancy_logs WHERE log_time < {0}", cutoff);
    }
}

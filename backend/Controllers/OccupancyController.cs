using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OccupancyController : ControllerBase
{
    private readonly IOccupancyLogService _logs;

    public OccupancyController(IOccupancyLogService logs)
    {
        _logs = logs;
    }

    [HttpGet("{zoneName}")]
    public async Task<IActionResult> GetRecent(string zoneName, [FromQuery] int hours = 24)
    {
        hours = Math.Clamp(hours, 1, 168);
        var logs = await _logs.GetRecentAsync(zoneName, hours);
        return Ok(logs.Select(l => new
        {
            logTime = l.LogTime,
            count = l.Count,
            capacity = l.Capacity,
        }));
    }

    [HttpGet("{zoneName}/series")]
    public async Task<IActionResult> GetSeries(
        string zoneName,
        [FromQuery] int hours = 24,
        [FromQuery] int bucketMinutes = 15)
    {
        hours = Math.Clamp(hours, 1, 168);
        bucketMinutes = Math.Clamp(bucketMinutes, 1, 240);
        var series = await _logs.GetSeriesAsync(zoneName, hours, bucketMinutes);
        return Ok(series.Select(p => new
        {
            t = p.BucketStart,
            avg = p.AvgCount,
            max = p.MaxCount,
            capacity = p.Capacity,
        }));
    }
}

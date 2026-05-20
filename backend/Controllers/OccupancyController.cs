using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OccupancyController : ControllerBase
{
    private readonly IOccupancyService _occupancyService;

    public OccupancyController(IOccupancyService occupancyService)
    {
        _occupancyService = occupancyService;
    }

    /// <summary>
    /// Görüntü işleme / sensör sisteminden gelen delta (in/out) verisini işler.
    /// Body: { "zoneName":"kutuphane", "from":"...", "in":2, "out":1, "to":"..." }
    /// zoneName opsiyonel; verilmezse "kutuphane" varsayılır.
    /// </summary>
    [HttpPost("sensor-event")]
    [AllowAnonymous]
    public async Task<ActionResult> PostSensorEvent([FromBody] OccupancySensorEventDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Body boş olamaz." });

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var log = await _occupancyService.ProcessSensorEventAsync(dto);
            return Ok(new
            {
                message = "Sensör verisi işlendi.",
                data = new
                {
                    zoneName = log.ZoneName,
                    count = log.Count,
                    capacity = log.Capacity,
                    occupancyRate = log.Capacity > 0
                        ? Math.Round((double)log.Count / log.Capacity * 100, 1)
                        : 0,
                    logTime = log.LogTime
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Belirli bir bölgenin en son doluluk verisini döndürür.
    /// </summary>
    [HttpGet("{zoneName}")]
    [Authorize]
    public async Task<ActionResult> GetOccupancy(string zoneName)
    {
        var latest = await _occupancyService.GetLatestOccupancyAsync(zoneName);

        if (latest == null)
        {
            return Ok(new
            {
                zoneName,
                count = 0,
                capacity = 0,
                occupancyRate = 0,
                logTime = (DateTime?)null,
                message = "Bu bölge için henüz veri bulunmuyor."
            });
        }

        var rate = latest.Capacity > 0
            ? Math.Round((double)latest.Count / latest.Capacity * 100, 1)
            : 0;

        return Ok(new
        {
            zoneName = latest.ZoneName,
            count = latest.Count,
            capacity = latest.Capacity,
            occupancyRate = rate,
            logTime = latest.LogTime
        });
    }
}

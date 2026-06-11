using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/devices")]
public class DeviceController : ControllerBase
{
    private readonly IDeviceService _deviceService;
    private readonly ILogger<DeviceController> _logger;

    public DeviceController(IDeviceService deviceService, ILogger<DeviceController> logger)
    {
        _deviceService = deviceService;
        _logger = logger;
    }

    [HttpPost("{deviceId}/events")]
    public async Task<IActionResult> PostEvents(string deviceId, [FromBody] DeviceEventDto dto)
    {
        var auth = await Authenticate(deviceId);
        if (auth != null) return auth;

        var newOccupancy = await _deviceService.ApplyEventAsync(deviceId, dto.In, dto.Out);
        await _deviceService.TouchLastSeenAsync(deviceId);
        return Ok(new { currentOccupancy = newOccupancy });
    }

    [HttpGet("{deviceId}/config")]
    public async Task<IActionResult> GetConfig(string deviceId)
    {
        var auth = await Authenticate(deviceId);
        if (auth != null) return auth;

        var config = await _deviceService.GetConfigForDeviceAsync(deviceId);
        await _deviceService.TouchLastSeenAsync(deviceId);
        return Ok(config);
    }

    [HttpPost("{deviceId}/snapshot")]
    [RequestSizeLimit(2 * 1024 * 1024)] // 2 MB cap
    public async Task<IActionResult> PostSnapshot(string deviceId, IFormFile snapshot)
    {
        var auth = await Authenticate(deviceId);
        if (auth != null) return auth;

        if (snapshot == null || snapshot.Length == 0)
        {
            return BadRequest(new { message = "Snapshot dosyası boş." });
        }
        if (snapshot.Length > 2 * 1024 * 1024)
        {
            return BadRequest(new { message = "Snapshot 2 MB'yi aşıyor." });
        }

        using var ms = new MemoryStream();
        await snapshot.CopyToAsync(ms);
        var bytes = ms.ToArray();

        // Width/Height için JPEG header parse — basit, header'da yoksa 0 koy.
        var (w, h) = TryParseJpegDimensions(bytes);

        await _deviceService.SaveSnapshotAsync(deviceId, bytes, w, h);
        await _deviceService.TouchLastSeenAsync(deviceId);
        return Ok(new { savedBytes = bytes.Length, width = w, height = h });
    }

    private async Task<IActionResult?> Authenticate(string deviceId)
    {
        var token = Request.Headers["X-Device-Token"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(token))
        {
            return Unauthorized(new { message = "X-Device-Token header eksik." });
        }
        var device = await _deviceService.AuthenticateAsync(deviceId, token);
        if (device == null)
        {
            return Unauthorized(new { message = "Geçersiz cihaz veya token." });
        }
        return null;
    }

    private static (int Width, int Height) TryParseJpegDimensions(byte[] data)
    {
        // SOF (Start of Frame) marker bul: 0xFFC0 .. 0xFFCF (except 0xFFC4, 0xFFC8, 0xFFCC)
        if (data.Length < 4 || data[0] != 0xFF || data[1] != 0xD8) return (0, 0);
        int i = 2;
        while (i + 8 < data.Length)
        {
            if (data[i] != 0xFF) { i++; continue; }
            byte marker = data[i + 1];
            if (marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC)
            {
                int h = (data[i + 5] << 8) | data[i + 6];
                int w = (data[i + 7] << 8) | data[i + 8];
                return (w, h);
            }
            int segmentLen = (data[i + 2] << 8) | data[i + 3];
            if (segmentLen < 2) return (0, 0);
            i += 2 + segmentLen;
        }
        return (0, 0);
    }
}

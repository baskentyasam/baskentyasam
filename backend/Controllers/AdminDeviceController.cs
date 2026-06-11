using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/devices")]
[Authorize(Roles = "SuperAdmin")]
public class AdminDeviceController : ControllerBase
{
    private readonly IDeviceService _deviceService;

    public AdminDeviceController(IDeviceService deviceService)
    {
        _deviceService = deviceService;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var devices = await _deviceService.ListAsync();
        return Ok(devices);
    }

    [HttpGet("{deviceId}")]
    public async Task<IActionResult> Get(string deviceId)
    {
        var detail = await _deviceService.GetAsync(deviceId);
        if (detail == null) return NotFound();
        return Ok(detail);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDeviceDto dto)
    {
        try
        {
            var created = await _deviceService.CreateAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{deviceId}/config")]
    public async Task<IActionResult> UpdateConfig(string deviceId, [FromBody] DeviceConfigUpdateDto dto)
    {
        var detail = await _deviceService.GetAsync(deviceId);
        if (detail == null) return NotFound();

        var config = await _deviceService.UpdateConfigAsync(deviceId, dto);
        return Ok(config);
    }

    [HttpPost("{deviceId}/snapshot/request")]
    public async Task<IActionResult> RequestSnapshot(string deviceId)
    {
        var detail = await _deviceService.GetAsync(deviceId);
        if (detail == null) return NotFound();
        await _deviceService.RequestSnapshotAsync(deviceId);
        return Ok(new { message = "Snapshot istendi. 10-30 sn içinde Pi yakalayacak." });
    }

    [HttpPost("{deviceId}/regenerate-token")]
    public async Task<IActionResult> RegenerateToken(string deviceId)
    {
        var token = await _deviceService.RegenerateTokenAsync(deviceId);
        if (token == null) return NotFound();
        return Ok(new { plainToken = token });
    }

    [HttpGet("{deviceId}/snapshot")]
    public async Task<IActionResult> GetLatestSnapshot(string deviceId)
    {
        var snap = await _deviceService.GetLatestSnapshotAsync(deviceId);
        if (snap == null) return NotFound(new { message = "Henüz snapshot yok." });
        Response.Headers["X-Snapshot-Created-At"] = snap.CreatedAt.ToString("o");
        Response.Headers["X-Snapshot-Width"] = snap.Width.ToString();
        Response.Headers["X-Snapshot-Height"] = snap.Height.ToString();
        return File(snap.JpegData, "image/jpeg");
    }
}

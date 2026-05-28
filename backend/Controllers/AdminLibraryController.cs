using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/library")]
[Authorize(Roles = "SuperAdmin")]
public class AdminLibraryController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminLibraryController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<LibraryArea>>> GetLibraryAreas()
    {
        return Ok(await _context.LibraryAreas.OrderBy(l => l.Name).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<LibraryArea>> Create([FromBody] UpsertLibraryAreaDto dto)
    {
        try
        {
            ValidateUpsertDto(dto);
            await EnsureUniqueActiveNameAsync(dto.Name.Trim());

            var area = new LibraryArea
            {
                Name = dto.Name.Trim(),
                Location = dto.Location?.Trim(),
                Capacity = dto.Capacity,
                CurrentOccupancy = dto.CurrentOccupancy,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
            };

            _context.LibraryAreas.Add(area);
            await _context.SaveChangesAsync();
            return Ok(area);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{libraryAreaId:int}")]
    public async Task<ActionResult<LibraryArea>> Update(int libraryAreaId, [FromBody] UpsertLibraryAreaDto dto)
    {
        try
        {
            var area = await _context.LibraryAreas.FindAsync(libraryAreaId);
            if (area == null)
            {
                return NotFound(new { message = "Kütüphane alanı bulunamadı." });
            }

            ValidateUpsertDto(dto);
            if (dto.IsActive)
            {
                await EnsureUniqueActiveNameAsync(dto.Name.Trim(), libraryAreaId);
            }

            area.Name = dto.Name.Trim();
            area.Location = dto.Location?.Trim();
            area.Capacity = dto.Capacity;
            area.CurrentOccupancy = dto.CurrentOccupancy;
            area.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return Ok(area);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{libraryAreaId:int}/metrics")]
    public async Task<ActionResult<LibraryArea>> UpdateMetrics(int libraryAreaId, [FromBody] UpdateLibraryMetricsDto dto)
    {
        try
        {
            var area = await _context.LibraryAreas.FindAsync(libraryAreaId);
            if (area == null)
            {
                return NotFound(new { message = "Kütüphane alanı bulunamadı." });
            }

            var capacity = Math.Max(dto.Capacity, 0);
            var occupancy = Math.Clamp(dto.CurrentOccupancy, 0, capacity);
            area.Capacity = capacity;
            area.CurrentOccupancy = occupancy;

            await _context.SaveChangesAsync();
            return Ok(area);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{libraryAreaId:int}/activate")]
    public async Task<ActionResult<LibraryArea>> Activate(int libraryAreaId)
    {
        try
        {
            var area = await _context.LibraryAreas.FindAsync(libraryAreaId);
            if (area == null)
            {
                return NotFound(new { message = "Kütüphane alanı bulunamadı." });
            }

            await EnsureUniqueActiveNameAsync(area.Name, libraryAreaId);
            area.IsActive = true;
            await _context.SaveChangesAsync();
            return Ok(area);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{libraryAreaId:int}/deactivate")]
    public async Task<ActionResult<LibraryArea>> Deactivate(int libraryAreaId)
    {
        var area = await _context.LibraryAreas.FindAsync(libraryAreaId);
        if (area == null)
        {
            return NotFound(new { message = "Kütüphane alanı bulunamadı." });
        }

        area.IsActive = false;
        await _context.SaveChangesAsync();
        return Ok(area);
    }

    private static void ValidateUpsertDto(UpsertLibraryAreaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new InvalidOperationException("Alan adı boş olamaz.");
        }

        if (dto.Capacity < 0)
        {
            throw new InvalidOperationException("Kapasite 0 veya daha büyük olmalıdır.");
        }

        if (dto.CurrentOccupancy < 0)
        {
            throw new InvalidOperationException("Mevcut doluluk 0 veya daha büyük olmalıdır.");
        }

        if (dto.CurrentOccupancy > dto.Capacity)
        {
            throw new InvalidOperationException("Mevcut doluluk kapasiteden büyük olamaz.");
        }
    }

    private async Task EnsureUniqueActiveNameAsync(string name, int? excludeId = null)
    {
        var normalized = name.ToLower();
        var exists = await _context.LibraryAreas.AnyAsync(l =>
            l.IsActive &&
            l.Name.ToLower() == normalized &&
            (!excludeId.HasValue || l.Id != excludeId.Value));

        if (exists)
        {
            throw new InvalidOperationException("Bu isimde aktif bir kütüphane alanı zaten var.");
        }
    }
}

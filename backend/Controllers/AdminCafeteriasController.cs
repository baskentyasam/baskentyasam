using System.Security.Claims;
using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/cafeterias")]
[Authorize(Roles = "SuperAdmin,SubAdmin")]
public class AdminCafeteriasController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAdminAuthorizationService _adminAuthorizationService;

    public AdminCafeteriasController(AppDbContext context, IAdminAuthorizationService adminAuthorizationService)
    {
        _context = context;
        _adminAuthorizationService = adminAuthorizationService;
    }

    [HttpGet]
    public async Task<ActionResult<List<Cafeteria>>> GetCafeterias()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (await _adminAuthorizationService.IsSuperAdminAsync(userId.Value))
        {
            return Ok(await _context.Cafeterias.OrderBy(c => c.Name).ToListAsync());
        }

        var assignment = await _adminAuthorizationService.GetActiveAssignmentAsync(userId.Value);
        if (assignment == null || assignment.ModuleType != AdminModuleType.Cafeteria) return Forbid();
        if (!int.TryParse(assignment.ScopeKey, out var cafeteriaId)) return Forbid();

        var one = await _context.Cafeterias.Where(c => c.Id == cafeteriaId).ToListAsync();
        return Ok(one);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<Cafeteria>> Create([FromBody] UpsertCafeteriaDto dto)
    {
        var exists = await _context.Cafeterias.AnyAsync(c => c.Name.ToLower() == dto.Name.Trim().ToLower());
        if (exists) return BadRequest(new { message = "Bu isimde bir kafeterya zaten var." });

        var cafeteria = new Cafeteria
        {
            Name = dto.Name.Trim(),
            Location = dto.Location?.Trim(),
            Description = dto.Description?.Trim(),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };
        _context.Cafeterias.Add(cafeteria);
        await _context.SaveChangesAsync();
        return Ok(cafeteria);
    }

    [HttpPut("{cafeteriaId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<Cafeteria>> Update(int cafeteriaId, [FromBody] UpsertCafeteriaDto dto)
    {
        var cafeteria = await _context.Cafeterias.FindAsync(cafeteriaId);
        if (cafeteria == null) return NotFound();

        cafeteria.Name = dto.Name.Trim();
        cafeteria.Location = dto.Location?.Trim();
        cafeteria.Description = dto.Description?.Trim();
        cafeteria.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return Ok(cafeteria);
    }

    [HttpGet("{cafeteriaId:int}")]
    public async Task<ActionResult<Cafeteria>> GetDetail(int cafeteriaId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Cafeteria, cafeteriaId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var cafeteria = await _context.Cafeterias.FirstOrDefaultAsync(c => c.Id == cafeteriaId);
        if (cafeteria == null) return NotFound();
        return Ok(cafeteria);
    }

    [HttpGet("{cafeteriaId:int}/menu-items")]
    public async Task<ActionResult<List<MenuItem>>> GetMenuItems(int cafeteriaId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Cafeteria, cafeteriaId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var items = await _context.MenuItems
            .Where(m => m.CafeteriaId == cafeteriaId)
            .OrderBy(m => m.Name)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("{cafeteriaId:int}/menu-items")]
    public async Task<ActionResult<MenuItem>> CreateMenuItem(int cafeteriaId, [FromBody] UpsertMenuItemDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Cafeteria, cafeteriaId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var menuItem = new MenuItem
        {
            Name = dto.Name.Trim(),
            Price = dto.Price,
            Description = dto.Description?.Trim(),
            ImageUrl = dto.ImageUrl?.Trim(),
            IsAvailable = dto.IsAvailable,
            CafeteriaId = cafeteriaId
        };
        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();
        return Ok(menuItem);
    }

    [HttpPut("{cafeteriaId:int}/menu-items/{menuItemId:int}")]
    public async Task<ActionResult<MenuItem>> UpdateMenuItem(int cafeteriaId, int menuItemId, [FromBody] UpsertMenuItemDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Cafeteria, cafeteriaId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var item = await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == menuItemId && m.CafeteriaId == cafeteriaId);
        if (item == null) return NotFound();

        item.Name = dto.Name.Trim();
        item.Price = dto.Price;
        item.Description = dto.Description?.Trim();
        item.ImageUrl = dto.ImageUrl?.Trim();
        item.IsAvailable = dto.IsAvailable;
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpGet("{cafeteriaId:int}/orders")]
    public async Task<ActionResult<List<OrderResponseDto>>> GetOrders(int cafeteriaId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Cafeteria, cafeteriaId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var orders = await _context.Orders
            .Where(o => o.CafeteriaId == cafeteriaId)
            .Include(o => o.User)
            .Include(o => o.OrderItems)
            .ThenInclude(i => i.MenuItem)
            .OrderByDescending(o => o.CreatedAt)
            .Take(200)
            .ToListAsync();

        var result = orders.Select(o => new OrderResponseDto
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            UserId = o.UserId,
            CustomerName = o.User.Name,
            CustomerEmail = o.User.Email,
            StudentNo = o.User.StudentNo,
            UserType = o.UserType,
            TotalAmount = o.TotalAmount,
            Status = o.Status,
            IsPaid = o.IsPaid,
            CreatedAt = o.CreatedAt,
            ApprovedAt = o.ApprovedAt,
            ReadyAt = o.ReadyAt,
            PaidAt = o.PaidAt,
            PickupTime = o.PickupTime,
            Note = o.Note,
            OrderItems = o.OrderItems.Select(oi => new OrderItemResponseDto
            {
                Id = oi.Id,
                MenuItemId = oi.MenuItemId,
                MenuItemName = oi.MenuItem.Name,
                Quantity = oi.Quantity,
                Price = oi.Price
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

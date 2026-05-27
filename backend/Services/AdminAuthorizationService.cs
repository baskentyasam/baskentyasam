using ApiProject.Data;
using ApiProject.Models;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IAdminAuthorizationService
{
    Task<bool> IsSuperAdminAsync(int userId);
    Task<AdminAssignment?> GetActiveAssignmentAsync(int userId);
    Task EnsureModuleScopeAccessAsync(int userId, AdminModuleType moduleType, string scopeKey);
}

public class AdminAuthorizationService : IAdminAuthorizationService
{
    private readonly AppDbContext _context;

    public AdminAuthorizationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> IsSuperAdminAsync(int userId)
    {
        return await _context.Users.AnyAsync(u =>
            u.Id == userId &&
            u.IsActive &&
            u.Role == UserRole.SuperAdmin);
    }

    public async Task<AdminAssignment?> GetActiveAssignmentAsync(int userId)
    {
        return await _context.AdminAssignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId && a.IsActive);
    }

    public async Task EnsureModuleScopeAccessAsync(int userId, AdminModuleType moduleType, string scopeKey)
    {
        if (await IsSuperAdminAsync(userId))
        {
            return;
        }

        var hasAccess = await _context.Users.AnyAsync(u =>
            u.Id == userId &&
            u.IsActive &&
            u.Role == UserRole.SubAdmin);
        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("Bu işlem için yönetici yetkiniz bulunmuyor.");
        }

        var assignment = await _context.AdminAssignments.FirstOrDefaultAsync(a =>
            a.UserId == userId &&
            a.IsActive &&
            a.ModuleType == moduleType &&
            a.ScopeKey == scopeKey);

        if (assignment == null)
        {
            throw new UnauthorizedAccessException("Bu kaynağa erişim yetkiniz bulunmuyor.");
        }
    }
}

using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IUserManagementService
{
    Task<List<AdminUserListItemDto>> GetUsersAsync(AdminUserListQuery query);
    Task<AdminUserDetailDto?> GetUserByIdAsync(int id);
    Task<AdminUserDetailDto> UpdateUserAsync(int id, UpdateAdminUserDto dto);
    Task<AdminUserDetailDto> ActivateUserAsync(int id, int currentUserId);
    Task<AdminUserDetailDto> DeactivateUserAsync(int id, int currentUserId);
}

public class UserManagementService : IUserManagementService
{
    private const string ProtectedSuperAdminEmail = "systemadmin@baskentyasam.com";

    private readonly AppDbContext _context;

    public UserManagementService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<AdminUserListItemDto>> GetUsersAsync(AdminUserListQuery query)
    {
        if (!UserRoleDisplayHelper.TryParseRoleFilter(query.Role, out var roleFilter))
        {
            throw new ArgumentException("Geçersiz rol filtresi.");
        }

        var usersQuery = _context.Users.AsNoTracking().AsQueryable();

        if (roleFilter.HasValue)
        {
            usersQuery = usersQuery.Where(u => u.Role == roleFilter.Value);
        }

        if (query.IsActive.HasValue)
        {
            usersQuery = usersQuery.Where(u => u.IsActive == query.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            usersQuery = usersQuery.Where(u =>
                u.Name.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.StudentNo != null && u.StudentNo.ToLower().Contains(term)));
        }

        var users = await usersQuery
            .OrderBy(u => u.Name)
            .ToListAsync();

        return users.Select(MapListItem).ToList();
    }

    public async Task<AdminUserDetailDto?> GetUserByIdAsync(int id)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        return user == null ? null : MapDetail(user);
    }

    public async Task<AdminUserDetailDto> UpdateUserAsync(int id, UpdateAdminUserDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        var name = dto.Name?.Trim() ?? string.Empty;
        var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException("Ad Soyad zorunludur.");
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("E-posta zorunludur.");
        }

        var emailTaken = await _context.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == email);
        if (emailTaken)
        {
            throw new InvalidOperationException("Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.");
        }

        user.Name = name;
        user.Email = email;
        user.StudentNo = string.IsNullOrWhiteSpace(dto.StudentNo) ? null : dto.StudentNo.Trim();

        await _context.SaveChangesAsync();
        return MapDetail(user);
    }

    public async Task<AdminUserDetailDto> ActivateUserAsync(int id, int currentUserId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRole.Admin)
        {
            throw new InvalidOperationException("Legacy Admin hesapları aktifleştirilemez.");
        }

        user.IsActive = true;
        await _context.SaveChangesAsync();
        return MapDetail(user);
    }

    public async Task<AdminUserDetailDto> DeactivateUserAsync(int id, int currentUserId)
    {
        if (id == currentUserId)
        {
            throw new InvalidOperationException("Kendi hesabınızı pasifleştiremezsiniz.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRole.Admin)
        {
            throw new InvalidOperationException("Legacy Admin hesapları bu ekrandan yönetilemez.");
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            var activeSuperAdminCount = await _context.Users.CountAsync(u =>
                u.Role == UserRole.SuperAdmin && u.IsActive);

            if (activeSuperAdminCount <= 1)
            {
                throw new InvalidOperationException("Sistemdeki son aktif SuperAdmin pasifleştirilemez.");
            }

            if (user.Email.Equals(ProtectedSuperAdminEmail, StringComparison.OrdinalIgnoreCase) &&
                activeSuperAdminCount <= 1)
            {
                throw new InvalidOperationException("Sistem yöneticisi hesabı pasifleştirilemez.");
            }
        }

        user.IsActive = false;
        await _context.SaveChangesAsync();
        return MapDetail(user);
    }

    private static AdminUserListItemDto MapListItem(User user) => MapDetail(user);

    private static AdminUserDetailDto MapDetail(User user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role.ToString(),
        RoleDisplayName = UserRoleDisplayHelper.GetDisplayName(user.Role),
        IsActive = user.IsActive,
        StudentNo = user.StudentNo,
        IsLegacyAdmin = user.Role == UserRole.Admin,
    };
}

using ApiProject.Data;
using ApiProject.Helpers;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IUserManagementService
{
    Task<List<AdminUserListItemDto>> GetUsersAsync(AdminUserListQuery query);
    Task<AdminUserDetailDto?> GetUserByIdAsync(int id);
    Task<AdminUserDetailDto> UpdateUserAsync(int id, UpdateAdminUserDto dto);
    Task<AdminUserDetailDto> UpdateUserRoleAsync(int id, UpdateAdminUserRoleDto dto, int currentUserId);
    Task ResetUserPasswordAsync(int id, ResetAdminUserPasswordDto dto);
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

        var usersQuery = _context.Users
            .AsNoTracking()
            .Where(u => u.Role != UserRole.Admin);

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
        if (user == null || user.Role == UserRole.Admin)
        {
            return null;
        }

        return await MapDetailAsync(user);
    }

    public async Task<AdminUserDetailDto> UpdateUserAsync(int id, UpdateAdminUserDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRole.Admin)
        {
            throw new InvalidOperationException("Bu kullanıcı yönetilemez.");
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
        return await MapDetailAsync(user);
    }

    public async Task<AdminUserDetailDto> UpdateUserRoleAsync(
        int id,
        UpdateAdminUserRoleDto dto,
        int currentUserId)
    {
        if (id == currentUserId)
        {
            throw new InvalidOperationException("Kendi rolünüzü bu ekrandan değiştiremezsiniz.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRole.Admin)
        {
            throw new InvalidOperationException("Bu kullanıcının rolü değiştirilemez.");
        }

        if (!TryParseAssignableRole(dto.Role, out var newRole))
        {
            throw new InvalidOperationException("Geçersiz rol seçimi.");
        }

        if (user.Role == UserRole.SuperAdmin && newRole != UserRole.SuperAdmin)
        {
            var activeSuperAdminCount = await _context.Users.CountAsync(u =>
                u.Role == UserRole.SuperAdmin && u.IsActive);

            if (activeSuperAdminCount <= 1)
            {
                throw new InvalidOperationException("Sistemdeki son aktif admin sistem yöneticisi başka role alınamaz.");
            }
        }

        if (newRole == UserRole.SubAdmin)
        {
            await ApplySubAdminAssignmentAsync(user, dto, currentUserId);
        }
        else
        {
            await DeactivateUserAssignmentsAsync(user.Id);
        }

        user.Role = newRole;

        if (newRole is UserRole.SubAdmin or UserRole.SuperAdmin or UserRole.Staff)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE users SET login_type = 'school_email'::login_type WHERE id = {0}",
                user.Id);
        }

        await _context.SaveChangesAsync();
        return await MapDetailAsync(user);
    }

    public async Task ResetUserPasswordAsync(int id, ResetAdminUserPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRole.Admin)
        {
            throw new InvalidOperationException("Bu kullanıcının şifresi sıfırlanamaz.");
        }

        var (passwordValid, passwordError) = PasswordPolicy.Validate(dto.NewPassword);
        if (!passwordValid)
        {
            throw new InvalidOperationException(passwordError ?? PasswordPolicy.ErrorMessage);
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();
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
            throw new InvalidOperationException("Bu hesap aktifleştirilemez.");
        }

        user.IsActive = true;
        await _context.SaveChangesAsync();
        return await MapDetailAsync(user);
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
            throw new InvalidOperationException("Bu hesap pasifleştirilemez.");
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            var activeSuperAdminCount = await _context.Users.CountAsync(u =>
                u.Role == UserRole.SuperAdmin && u.IsActive);

            if (activeSuperAdminCount <= 1)
            {
                throw new InvalidOperationException("Sistemdeki son aktif admin sistem yöneticisi pasifleştirilemez.");
            }

            if (user.Email.Equals(ProtectedSuperAdminEmail, StringComparison.OrdinalIgnoreCase) &&
                activeSuperAdminCount <= 1)
            {
                throw new InvalidOperationException("Sistem yöneticisi hesabı pasifleştirilemez.");
            }
        }

        user.IsActive = false;
        await _context.SaveChangesAsync();
        return await MapDetailAsync(user);
    }

    private async Task ApplySubAdminAssignmentAsync(User user, UpdateAdminUserRoleDto dto, int currentUserId)
    {
        if (string.IsNullOrWhiteSpace(dto.ModuleType) ||
            !Enum.TryParse<AdminModuleType>(dto.ModuleType, ignoreCase: true, out var moduleType))
        {
            throw new InvalidOperationException("Alt admin için modül seçimi zorunludur.");
        }

        if (string.IsNullOrWhiteSpace(dto.ScopeKey))
        {
            throw new InvalidOperationException("Alt admin için kapsam seçimi zorunludur.");
        }

        var scopeKey = dto.ScopeKey.Trim();
        string resolvedScopeDisplayName;

        if (moduleType == AdminModuleType.Appointment)
        {
            throw new InvalidOperationException("Randevu modülü yalnızca sistem yöneticisi tarafından yönetilebilir.");
        }

        if (moduleType == AdminModuleType.Cafeteria)
        {
            if (!int.TryParse(scopeKey, out var cafeteriaId) ||
                !await _context.Cafeterias.AnyAsync(c => c.Id == cafeteriaId && c.IsActive))
            {
                throw new InvalidOperationException("Seçilen kafeterya geçerli değil.");
            }

            resolvedScopeDisplayName = await _context.Cafeterias
                .Where(c => c.Id == cafeteriaId)
                .Select(c => c.Name)
                .FirstAsync();
        }
        else if (moduleType == AdminModuleType.Parking)
        {
            if (!int.TryParse(scopeKey, out var parkingLotId) ||
                !await _context.ParkingLots.AnyAsync(p => p.Id == parkingLotId && p.IsActive))
            {
                throw new InvalidOperationException("Seçilen otopark geçerli değil.");
            }

            resolvedScopeDisplayName = await _context.ParkingLots
                .Where(p => p.Id == parkingLotId)
                .Select(p => p.Name)
                .FirstAsync();
        }
        else if (moduleType == AdminModuleType.Library)
        {
            if (!scopeKey.Equals(AdminAssignableScopes.LibraryScopeKey, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Geçersiz kütüphane kapsamı.");
            }

            resolvedScopeDisplayName = AdminAssignableScopes.LibraryDisplayName;
            scopeKey = AdminAssignableScopes.LibraryScopeKey;
        }
        else
        {
            throw new InvalidOperationException("Geçersiz modül tipi.");
        }

        await DeactivateUserAssignmentsAsync(user.Id);

        _context.AdminAssignments.Add(new AdminAssignment
        {
            UserId = user.Id,
            ModuleType = moduleType,
            ScopeKey = scopeKey,
            ScopeDisplayName = resolvedScopeDisplayName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = currentUserId,
        });
    }

    private async Task DeactivateUserAssignmentsAsync(int userId)
    {
        var assignments = await _context.AdminAssignments
            .Where(a => a.UserId == userId && a.IsActive)
            .ToListAsync();

        foreach (var assignment in assignments)
        {
            assignment.IsActive = false;
        }
    }

    private static bool TryParseAssignableRole(string? role, out UserRole parsed)
    {
        parsed = UserRole.Student;
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        if (Enum.TryParse<UserRole>(role, ignoreCase: true, out var exact) &&
            exact is UserRole.Student or UserRole.Teacher or UserRole.Staff or UserRole.SuperAdmin or UserRole.SubAdmin)
        {
            parsed = exact;
            return true;
        }

        return role.Trim().ToLowerInvariant() switch
        {
            "student" or "öğrenci" => Assign(UserRole.Student, out parsed),
            "teacher" or "instructor" or "öğretim" => Assign(UserRole.Teacher, out parsed),
            "staff" or "cashier" or "kasiyer" => Assign(UserRole.Staff, out parsed),
            "superadmin" => Assign(UserRole.SuperAdmin, out parsed),
            "subadmin" => Assign(UserRole.SubAdmin, out parsed),
            _ => false,
        };
    }

    private static bool Assign(UserRole role, out UserRole parsed)
    {
        parsed = role;
        return true;
    }

    private static AdminUserListItemDto MapListItem(User user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role.ToString(),
        RoleDisplayName = UserRoleDisplayHelper.GetDisplayName(user.Role),
        IsActive = user.IsActive,
        StudentNo = user.StudentNo,
        IsLegacyAdmin = false,
    };

    private async Task<AdminUserDetailDto> MapDetailAsync(User user)
    {
        var detail = new AdminUserDetailDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            RoleDisplayName = UserRoleDisplayHelper.GetDisplayName(user.Role),
            IsActive = user.IsActive,
            StudentNo = user.StudentNo,
            IsLegacyAdmin = false,
        };

        if (user.Role == UserRole.SubAdmin)
        {
            var assignment = await _context.AdminAssignments
                .AsNoTracking()
                .Where(a => a.UserId == user.Id && a.IsActive)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            if (assignment != null)
            {
                detail.SubAdminModuleType = assignment.ModuleType.ToString();
                detail.SubAdminScopeKey = assignment.ScopeKey;
                detail.SubAdminScopeDisplayName = assignment.ScopeDisplayName;
            }
        }

        return detail;
    }
}

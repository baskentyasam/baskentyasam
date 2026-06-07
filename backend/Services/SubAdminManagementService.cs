using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface ISubAdminManagementService
{
    Task<SubAdminListItemDto> CreateSubAdminAsync(CreateSubAdminDto dto, int createdByUserId);
    Task<List<SubAdminListItemDto>> GetSubAdminsAsync();
    Task<bool> DeactivateSubAdminAsync(int userId);
}

public class SubAdminManagementService : ISubAdminManagementService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SubAdminManagementService> _logger;

    public SubAdminManagementService(AppDbContext context, ILogger<SubAdminManagementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SubAdminListItemDto> CreateSubAdminAsync(CreateSubAdminDto dto, int createdByUserId)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
        {
            throw new InvalidOperationException("Bu e-posta adresi zaten kullanılıyor.");
        }

        if (dto.ModuleType == AdminModuleType.Cafeteria)
        {
            var exists = int.TryParse(dto.ScopeKey, out var cafeteriaId) &&
                         await _context.Cafeterias.AnyAsync(c => c.Id == cafeteriaId && c.IsActive);
            if (!exists)
            {
                throw new InvalidOperationException("Seçilen kafeterya scope'u geçerli değil.");
            }
        }

        if (dto.ModuleType == AdminModuleType.Parking)
        {
            var exists = int.TryParse(dto.ScopeKey, out var parkingLotId) &&
                         await _context.ParkingLots.AnyAsync(p => p.Id == parkingLotId && p.IsActive);
            if (!exists)
            {
                throw new InvalidOperationException("Seçilen otopark scope'u geçerli değil.");
            }
        }

        if (dto.ModuleType == AdminModuleType.Library &&
            !dto.ScopeKey.Trim().Equals(AdminAssignableScopes.LibraryScopeKey, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Geçersiz kütüphane kapsamı.");
        }

        if (dto.ModuleType == AdminModuleType.Appointment &&
            !dto.ScopeKey.Trim().Equals(AdminAssignableScopes.AppointmentScopeKey, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Geçersiz randevu kapsamı.");
        }

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = UserRole.SubAdmin,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var existingActiveAssignments = await _context.AdminAssignments
            .Where(a => a.UserId == user.Id && a.IsActive)
            .ToListAsync();
        if (existingActiveAssignments.Count > 0)
        {
            foreach (var assignment in existingActiveAssignments)
            {
                assignment.IsActive = false;
            }
        }

        string resolvedScopeDisplayName = dto.ScopeDisplayName.Trim();
        if (dto.ModuleType == AdminModuleType.Cafeteria && int.TryParse(dto.ScopeKey, out var cafeteriaIdForName))
        {
            resolvedScopeDisplayName = await _context.Cafeterias
                .Where(c => c.Id == cafeteriaIdForName)
                .Select(c => c.Name)
                .FirstAsync();
        }
        else if (dto.ModuleType == AdminModuleType.Parking && int.TryParse(dto.ScopeKey, out var parkingIdForName))
        {
            resolvedScopeDisplayName = await _context.ParkingLots
                .Where(p => p.Id == parkingIdForName)
                .Select(p => p.Name)
                .FirstAsync();
        }
        else if (dto.ModuleType == AdminModuleType.Library)
        {
            resolvedScopeDisplayName = AdminAssignableScopes.LibraryDisplayName;
        }
        else if (dto.ModuleType == AdminModuleType.Appointment)
        {
            resolvedScopeDisplayName = AdminAssignableScopes.AppointmentDisplayName;
        }

        var assignmentToCreate = new AdminAssignment
        {
            UserId = user.Id,
            ModuleType = dto.ModuleType,
            ScopeKey = dto.ScopeKey.Trim(),
            ScopeDisplayName = resolvedScopeDisplayName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = createdByUserId
        };

        _context.AdminAssignments.Add(assignmentToCreate);
        await _context.SaveChangesAsync();

        // SubAdmin hesapları doğrudan giriş yapabilmeli (doğrulanmış kabul edilir)
        await _context.Database.ExecuteSqlRawAsync(
            "UPDATE users SET login_type = 'school_email'::login_type WHERE id = {0}",
            user.Id
        );

        _logger.LogInformation(
            "SubAdmin oluşturuldu. UserId={UserId}, Module={Module}, Scope={Scope}",
            user.Id,
            dto.ModuleType,
            dto.ScopeKey);

        return new SubAdminListItemDto
        {
            UserId = user.Id,
            Name = user.Name,
            Email = user.Email,
            IsActive = user.IsActive,
            Role = user.Role.ToString(),
            Assignment = MapAssignment(assignmentToCreate)
        };
    }

    public async Task<List<SubAdminListItemDto>> GetSubAdminsAsync()
    {
        var users = await _context.Users
            .Where(u => u.Role == UserRole.SubAdmin)
            .OrderBy(u => u.Name)
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();
        var assignments = await _context.AdminAssignments
            .Where(a => userIds.Contains(a.UserId) && a.IsActive)
            .ToListAsync();

        return users.Select(u =>
        {
            var assignment = assignments.FirstOrDefault(a => a.UserId == u.Id);
            return new SubAdminListItemDto
            {
                UserId = u.Id,
                Name = u.Name,
                Email = u.Email,
                IsActive = u.IsActive,
                Role = u.Role.ToString(),
                Assignment = assignment == null ? null : MapAssignment(assignment)
            };
        }).ToList();
    }

    public async Task<bool> DeactivateSubAdminAsync(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.Role == UserRole.SubAdmin);
        if (user == null)
        {
            return false;
        }

        user.IsActive = false;
        var activeAssignments = await _context.AdminAssignments
            .Where(a => a.UserId == userId && a.IsActive)
            .ToListAsync();

        foreach (var assignment in activeAssignments)
        {
            assignment.IsActive = false;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    private static AdminAssignmentDto MapAssignment(AdminAssignment assignment)
    {
        return new AdminAssignmentDto
        {
            Id = assignment.Id,
            ModuleType = assignment.ModuleType.ToString(),
            ScopeKey = assignment.ScopeKey,
            ScopeDisplayName = assignment.ScopeDisplayName,
            IsActive = assignment.IsActive,
            CreatedAt = assignment.CreatedAt
        };
    }
}

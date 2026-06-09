using ApiProject.Models;

namespace ApiProject.Services;

public static class UserRoleDisplayHelper
{
    public static string GetDisplayName(UserRole role)
    {
        return role switch
        {
            UserRole.Student => "Öğrenci",
            UserRole.Teacher => "Öğretim Elemanı",
            UserRole.Personnel => "İdari Personel",
            UserRole.Staff => "Kasiyer",
            UserRole.SuperAdmin => "Admin Sistem Yöneticisi",
            UserRole.SubAdmin => "Alt Admin",
            UserRole.Admin => "Legacy / Pasif Eski Rol",
            _ => role.ToString(),
        };
    }

    public static bool TryParseRoleFilter(string? role, out UserRole? parsed)
    {
        parsed = null;
        if (string.IsNullOrWhiteSpace(role))
        {
            return true;
        }

        if (Enum.TryParse<UserRole>(role, ignoreCase: true, out var exact))
        {
            parsed = exact;
            return true;
        }

        return role.Trim().ToLowerInvariant() switch
        {
            "student" or "öğrenci" => Assign(UserRole.Student, out parsed),
            "teacher" or "instructor" or "öğretim" => Assign(UserRole.Teacher, out parsed),
            "personnel" or "idari" or "idari personel" => Assign(UserRole.Personnel, out parsed),
            "staff" or "cashier" or "kasiyer" => Assign(UserRole.Staff, out parsed),
            "superadmin" => Assign(UserRole.SuperAdmin, out parsed),
            "subadmin" => Assign(UserRole.SubAdmin, out parsed),
            "admin" or "legacy" => Assign(UserRole.Admin, out parsed),
            _ => false,
        };
    }

    private static bool Assign(UserRole role, out UserRole? parsed)
    {
        parsed = role;
        return true;
    }
}

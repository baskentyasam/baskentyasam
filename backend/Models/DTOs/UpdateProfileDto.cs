using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

/// <summary>
/// Kullanıcının kendi profilini güncellemek için gönderdiği veri.
/// Yalnızca dolu (null olmayan) alanlar güncellenir; null gönderilirse o alan değiştirilmez.
/// Boş string ("") gönderilirse alan temizlenir (null'a alınır).
/// </summary>
public class UpdateProfileDto
{
    /// <summary>Base64 data URL biçiminde profil fotoğrafı veya null.</summary>
    public string? ProfileImage { get; set; }

    [MaxLength(200)]
    public string? Department { get; set; }

    [MaxLength(50)]
    public string? RoomNumber { get; set; }

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(20)]
    public string? ClassLevel { get; set; }

    /// <summary>Öğretim elemanı için: verdiği dersler, virgülle ayrılmış.</summary>
    public string? Courses { get; set; }

    /// <summary>Öğrenci/Personel numarası (öğrenci tarafından profilinden değiştirilebilir).</summary>
    [MaxLength(50)]
    public string? StudentNo { get; set; }
}

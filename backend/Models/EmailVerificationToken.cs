using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

/// <summary>
/// E-posta doğrulama token'larını veritabanında saklar.
/// Token'lar SHA256 ile hashli tutulur; plain token yalnızca e-postada gönderilir.
/// </summary>
[Table("email_verification_tokens")]
public class EmailVerificationToken
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    /// <summary>SHA256(plainToken) hex string — 64 karakter</summary>
    [Required]
    [MaxLength(64)]
    [Column("token_hash")]
    public string TokenHash { get; set; } = string.Empty;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
}

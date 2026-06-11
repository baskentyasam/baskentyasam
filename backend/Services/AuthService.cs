using ApiProject.Data;
using ApiProject.Helpers;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Data.Common;
using BCrypt.Net;
using Microsoft.Extensions.Logging;

namespace ApiProject.Services;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<bool> VerifyEmailAsync(string token, int userId);
    /// <returns>(success, cooldownSeconds). success=false ise cooldownSeconds dolmadıysa pozitiftir.</returns>
    Task<(bool Success, int CooldownSeconds)> ResendVerificationEmailAsync(string email);
    string GenerateJwtToken(User user);
    /// <summary>E-posta kayıtlı değilse sessizce çıkar; enumeration riskini azaltmak için.</summary>
    /// <summary>Development + SMTP yoksa sıfırlama bağlantısını döner.</summary>
    Task<string?> RequestPasswordResetAsync(string email);
    /// <summary>Geçerli token ile şifreyi günceller; token tek kullanımlıktır.</summary>
    Task<bool> ResetPasswordWithTokenAsync(string plainToken, string newPassword);
    Task<(bool Success, string? Error)> ChangePasswordAsync(int userId, string currentPassword, string newPassword);
    Task<User?> GetUserByIdAsync(int userId);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;

    // NOT: E-posta doğrulama token'ları artık veritabanında saklanıyor (EmailVerificationToken tablosu).
    // Eski in-memory ConcurrentDictionary kaldırıldı; Docker restart ve load balancer uyumlu.

    public AuthService(AppDbContext context, IConfiguration configuration, IEmailService emailService, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto loginDto)
    {
        var usernameOrEmail = loginDto.UsernameOrEmail?.ToLower().Trim() ?? string.Empty;
        
        if (string.IsNullOrEmpty(usernameOrEmail))
            return null;

        // Kullanıcı adı (Name) veya Email ile arama yap
        var user = await _context.Users
            .FirstOrDefaultAsync(u => 
                u.Email.ToLower().Trim() == usernameOrEmail || 
                u.Name.ToLower().Trim() == usernameOrEmail);

        if (user == null)
            return null;

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Hesabınız pasif durumda. Lütfen sistem yöneticisi ile iletişime geçin.");
        }

        if (user.Role == UserRole.Admin)
        {
            throw new UnauthorizedAccessException("Legacy yönetici hesabı devre dışıdır. Lütfen Sistem Yöneticisi hesabı kullanın.");
        }

        // BCrypt ile şifre kontrolü
        if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            return null;

        // Email doğrulama kontrolü
        // login_type veritabanında PostgreSQL ENUM (NULL, 'school_email', 'staff_id')
        // Ham SQL ile kontrol yapıyoruz
        //
        // ÖZEL DURUM: Kasiyer + SuperAdmin + SubAdmin hesapları için doğrulama zorunlu değil.
        // Staff kullanıcıları admin tarafından oluşturulur (public kayıt değil),
        // dolayısıyla e-posta doğrulaması gerekmez. İsim kontrolü yerine rol kontrolü.
        var skipVerification = user.Role == UserRole.Staff
            || user.Role == UserRole.SuperAdmin
            || user.Role == UserRole.SubAdmin;
        if (!skipVerification)
        {
            try
            {
                var connection = _context.Database.GetDbConnection();
                var shouldClose = connection.State != System.Data.ConnectionState.Open;
                if (shouldClose)
                {
                    await connection.OpenAsync();
                }

                try
                {
                    using var command = connection.CreateCommand();
                    command.CommandText = "SELECT login_type::text FROM users WHERE id = @userId";
                    var parameter = command.CreateParameter();
                    parameter.ParameterName = "@userId";
                    parameter.Value = user.Id;
                    command.Parameters.Add(parameter);

                    var loginType = await command.ExecuteScalarAsync();
                    var loginTypeString = loginType?.ToString() ?? string.Empty;

                    _logger.LogInformation(
                        "Login attempt - UserId: {UserId}, Email: {Email}, LoginType: '{LoginType}'",
                        user.Id, user.Email, loginTypeString);

                    if (string.IsNullOrWhiteSpace(loginTypeString))
                    {
                        _logger.LogWarning("Email doğrulanmamış kullanıcı giriş denemesi: {Email}", user.Email);
                        throw new UnauthorizedAccessException(
                            "Lütfen e-posta adresinizi doğrulayın. Kayıt sırasında gönderilen e-postadaki linke tıklayınız.");
                    }

                    _logger.LogInformation("Email doğrulaması başarılı: {Email}", user.Email);
                }
                finally
                {
                    if (shouldClose && connection.State == System.Data.ConnectionState.Open)
                    {
                        await connection.CloseAsync();
                    }
                }
            }
            catch (UnauthorizedAccessException)
            {
                // UnauthorizedAccessException'ı yukarı fırlat
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"login_type kontrolü sırasında hata: {user.Email}");
                throw new UnauthorizedAccessException("Giriş kontrolü sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
            }
        }

        var now = DateTime.UtcNow;
        if (user.FirstLoginAt == null)
        {
            user.FirstLoginAt = now;
        }
        user.LastLoginAt = now;
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Name = user.Name,
            Role = user.Role.ToString()
        };
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        var (passwordValid, passwordError) = PasswordPolicy.Validate(registerDto.Password);
        if (!passwordValid)
        {
            throw new InvalidOperationException(passwordError);
        }

        if (registerDto.Role is not UserRole.Student and not UserRole.Teacher and not UserRole.Personnel)
        {
            throw new InvalidOperationException("Bu kayıt tipi desteklenmiyor.");
        }

        // E-posta benzersizliği
        var email = registerDto.Email?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("E-posta adresi gereklidir.");
        }

        var fullName = $"{registerDto.FirstName?.Trim()} {registerDto.LastName?.Trim()}".Trim();
        if (string.IsNullOrWhiteSpace(fullName) && !string.IsNullOrWhiteSpace(registerDto.Username))
        {
            fullName = registerDto.Username.Trim();
        }

        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new InvalidOperationException("Ad soyad gereklidir.");
        }
        
        // Email unique kontrolü
        var existingEmail = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

        if (existingEmail != null)
        {
             throw new InvalidOperationException("Bu email adresi zaten kullanılıyor.");
        }

        // Şifreyi BCrypt ile hashle
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);

        // role_id foreign key için roles tablosundaki gerçek ID'yi kontrol et
        // AppDbContext.cs'de enum değerini +1 yaparak kaydediyoruz (Student=0 -> role_id=1, Teacher=1 -> role_id=2)
        // Bu yüzden enum değerini direkt kullanıyoruz, AppDbContext otomatik olarak +1 yapacak
        var user = new User
        {
            Name = fullName,
            Email = email,
            PasswordHash = passwordHash,
            Role = registerDto.Role, // Enum değerini direkt kullan (Student=0, Teacher=1, vb.)
            // AppDbContext.cs'de enum değerini +1 yaparak role_id'ye kaydedecek
            StudentNo = registerDto.StudentNo
            // LoginType ignore edildi, varsayılan olarak NULL kalacak (doğrulanmamış)
        };
        
        // Düzeltme: User kaydedildikten sonra ID oluşacak.

        // ÖNCE login_type NULL olan bir kayıt eklemek için ham SQL kullan
        // Entity Framework ignore ettiği için direkt SQL ile ekliyoruz
        try
        {
            // Önce Entity Framework ile ekle
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Sonra login_type'ı NULL yap (ExecuteSqlRawAsync ile)
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE users SET login_type = CAST(NULL AS login_type) WHERE id = {0}",
                user.Id
            );

            _logger.LogInformation($"Yeni kullanıcı kaydedildi (doğrulanmamış): UserId={user.Id}, Email={user.Email}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Kullanıcı kaydı sırasında hata: {user.Email}");
            // Hata varsa kullanıcıyı silmeyi dene
            try
            {
                var userToDelete = await _context.Users.FindAsync(user.Id);
                if (userToDelete != null)
                {
                    _context.Users.Remove(userToDelete);
                    await _context.SaveChangesAsync();
                }
            }
            catch { /* Silme hatası önemsiz */ }
            
            throw new InvalidOperationException($"Kayıt işlemi sırasında bir hata oluştu: {ex.Message}");
        }

        // Email doğrulama token'ı oluştur ve veritabanına kaydet (restart-safe)
        var verificationToken = Guid.NewGuid().ToString("N"); // 32 hex karakter, URL-safe
        var tokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(verificationToken))).ToLowerInvariant();

        // Kullanıcının önceki doğrulanmamış token'larını temizle
        var oldTokens = _context.EmailVerificationTokens.Where(t => t.UserId == user.Id);
        _context.EmailVerificationTokens.RemoveRange(oldTokens);

        _context.EmailVerificationTokens.Add(new ApiProject.Models.EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        _logger.LogInformation("Email doğrulama token'ı DB'ye kaydedildi: UserId={UserId}", user.Id);

        // Email doğrulama maili gönder (ZORUNLU - başarısız olursa kayıt iptal edilir)
        try
        {
            await _emailService.SendVerificationEmailAsync(email, user.Name, verificationToken, user.Id);
        }
        catch (Exception ex)
        {
            // Email gönderilemezse kullanıcıyı sil ve hata fırlat
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            _logger.LogError(ex, $"Email gönderilemedi, kullanıcı kaydı iptal edildi: {email}");
            throw new InvalidOperationException("Email gönderilirken bir hata oluştu. Lütfen SMTP ayarlarınızı kontrol edin ve daha sonra tekrar deneyin.");
        }

        // Kayıt başarılı - Email gönderildi
        // Kullanıcıya email doğrulama mesajı dön
        // Token boş dönüyoruz çünkü email doğrulamadan giriş yapılamaz
        return new AuthResponseDto
        {
            Token = "", // Email doğrulanmadığı için token yok
            UserId = user.Id,
            Name = user.Name,
            Role = user.Role.ToString(),
            Message = "Kayıt başarılı! Lütfen email adresinize gelen doğrulama linkine tıklayarak hesabınızı aktifleştirin."
        };
    }

    public async Task<(bool Success, int CooldownSeconds)> ResendVerificationEmailAsync(string email)
    {
        var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalizedEmail))
        {
            return (false, 0);
        }

        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.Email.ToLower().Trim() == normalizedEmail);

        // Enumeration'ı önlemek için kullanıcı yoksa da başarılı görünelim.
        if (user == null)
        {
            return (true, 60);
        }
        if (user.IsActive == false)
        {
            // Hesap zaten aktif (doğrulanmış)? Veya askıya alınmış? Yine sessiz.
            return (true, 60);
        }

        const int cooldownSeconds = 60;
        var lastToken = await _context.EmailVerificationTokens
            .Where(t => t.UserId == user.Id)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastToken != null)
        {
            var elapsed = (DateTime.UtcNow - lastToken.CreatedAt).TotalSeconds;
            if (elapsed < cooldownSeconds)
            {
                var wait = (int)Math.Ceiling(cooldownSeconds - elapsed);
                return (false, wait);
            }
        }

        var newToken = Guid.NewGuid().ToString("N");
        var tokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(newToken))).ToLowerInvariant();

        _context.EmailVerificationTokens.RemoveRange(
            _context.EmailVerificationTokens.Where(t => t.UserId == user.Id));
        _context.EmailVerificationTokens.Add(new ApiProject.Models.EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow,
        });
        await _context.SaveChangesAsync();

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email, user.Name, newToken, user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tekrar doğrulama maili gönderilemedi: {Email}", user.Email);
            return (false, cooldownSeconds);
        }

        return (true, cooldownSeconds);
    }

    public string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey bulunamadı.");
        var issuer = jwtSettings["Issuer"] ?? "ApiProject";
        var audience = jwtSettings["Audience"] ?? "ApiProjectUsers";
        var expiryMinutes = int.Parse(
            Environment.GetEnvironmentVariable("JWT_EXPIRES_MINUTES")
            ?? jwtSettings["ExpiryMinutes"]
            ?? "120");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<bool> VerifyEmailAsync(string token, int userId)
    {
        _logger.LogInformation($"Email doğrulama isteği: Token={token}, UserId={userId}");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            _logger.LogWarning($"Doğrulama başarısız: Kullanıcı bulunamadı ID={userId}");
            return false;
        }

        // login_type kontrolü (Ham SQL ile - PostgreSQL ENUM)
        var loginTypeResult = await _context.Database
            .SqlQueryRaw<string>("SELECT login_type::text FROM users WHERE id = {0}", userId)
            .ToListAsync();
        
        var currentLoginType = loginTypeResult.FirstOrDefault();
        
        _logger.LogInformation($"Kullanıcı bulundu: {user.Email}, LoginType={currentLoginType}");

        // Zaten doğrulanmışsa true dön (Idempotency)
        if (!string.IsNullOrEmpty(currentLoginType))
        {
            _logger.LogInformation("Kullanıcı zaten doğrulanmış.");
            return true;
        }

        // Veritabanı Token Kontrolü (restart-safe, load balancer uyumlu)
        var tokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

        var tokenRecord = await _context.EmailVerificationTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.ExpiresAt > DateTime.UtcNow);

        if (tokenRecord == null)
        {
            _logger.LogWarning("Email doğrulama: token DB'de bulunamadı veya süresi dolmuş. UserId={UserId}", userId);
            return false;
        }

        if (tokenRecord.UserId != userId)
        {
            _logger.LogWarning("Token userId uyuşmazlığı: TokenUserId={TokenUserId}, RequestUserId={RequestUserId}",
                tokenRecord.UserId, userId);
            return false;
        }

        // Tek kullanımlık — token'ı sil
        _context.EmailVerificationTokens.Remove(tokenRecord);
        await _context.SaveChangesAsync();

        // LoginType'ı "school_email" olarak güncelle (Ham SQL ile - PostgreSQL ENUM tipi için)
        try
        {
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE users SET login_type = 'school_email'::login_type WHERE id = {0}", 
                userId
            );
            _logger.LogInformation("Email başarıyla doğrulandı ve login_type güncellendi.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "login_type güncellenirken hata oluştu.");
            // Hata olsa bile devam et (token zaten silindi, kullanıcı var)
        }

        return true;
    }

    public async Task<string?> RequestPasswordResetAsync(string email)
    {
        var normalized = email?.Trim().ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrEmpty(normalized))
            return null;

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalized);

        if (user == null)
        {
            _logger.LogInformation("Şifre sıfırlama: e-posta sistemde yok (genel yanıt verilecek): {Email}", normalized);
            return null;
        }

        var expiryMinutes = _configuration.GetValue("PasswordReset:ExpiryMinutes", 20);
        if (expiryMinutes < 15) expiryMinutes = 15;
        if (expiryMinutes > 30) expiryMinutes = 30;

        var pending = await _context.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null)
            .ToListAsync();
        _context.PasswordResetTokens.RemoveRange(pending);

        var plainToken = GenerateSecureUrlToken();
        var tokenHash = HashPasswordResetToken(plainToken);

        var entity = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            CreatedAt = DateTime.UtcNow
        };
        _context.PasswordResetTokens.Add(entity);
        await _context.SaveChangesAsync();

        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL")
                           ?? _configuration["PasswordReset:FrontendUrl"]
                           ?? "http://localhost:3000";
        var resetLink =
            $"{frontendUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(plainToken)}";

        try
        {
            var sent = await _emailService.SendPasswordResetEmailAsync(user.Email, user.Name, resetLink, expiryMinutes);
            return sent ? null : resetLink;
        }
        catch (Exception ex)
        {
            _context.PasswordResetTokens.Remove(entity);
            await _context.SaveChangesAsync();
            _logger.LogError(ex, "Şifre sıfırlama e-postası gönderilemedi, token iptal: UserId={UserId}", user.Id);
            throw;
        }
    }

    public async Task<bool> ResetPasswordWithTokenAsync(string plainToken, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(plainToken) || string.IsNullOrWhiteSpace(newPassword))
            return false;

        var (passwordValid, passwordError) = PasswordPolicy.Validate(newPassword);
        if (!passwordValid)
        {
            throw new InvalidOperationException(passwordError);
        }

        var tokenHash = HashPasswordResetToken(plainToken.Trim());
        var row = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash &&
                t.UsedAt == null &&
                t.ExpiresAt > DateTime.UtcNow);

        if (row == null)
        {
            _logger.LogWarning("Şifre sıfırlama: geçersiz veya süresi dolmuş token");
            return false;
        }

        row.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        row.UsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Şifre sıfırlama başarılı: UserId={UserId}", row.UserId);
        return true;
    }

    public async Task<(bool Success, string? Error)> ChangePasswordAsync(int userId, string currentPassword, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(currentPassword) || string.IsNullOrWhiteSpace(newPassword))
        {
            return (false, "Mevcut ve yeni şifre gereklidir.");
        }

        var (passwordValid, passwordError) = PasswordPolicy.Validate(newPassword);
        if (!passwordValid)
        {
            return (false, passwordError);
        }

        if (currentPassword == newPassword)
        {
            return (false, "Yeni şifre mevcut şifreden farklı olmalıdır.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return (false, "Kullanıcı bulunamadı.");
        }

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
        {
            return (false, "Mevcut şifre hatalı.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Şifre değiştirildi: UserId={UserId}", userId);
        return (true, null);
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static string HashPasswordResetToken(string plain)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plain));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string GenerateSecureUrlToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}

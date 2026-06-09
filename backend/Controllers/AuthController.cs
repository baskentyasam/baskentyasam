using ApiProject.Models.DTOs;
using ApiProject.Services;
using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, AppDbContext context, IWebHostEnvironment environment, ILogger<AuthController> logger)
    {
        _authService = authService;
        _context = context;
        _environment = environment;
        _logger = logger;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        // Request body null kontrolü
        if (registerDto == null)
        {
            return BadRequest(new { message = "Request body boş olamaz." });
        }

        // ModelState validation kontrolü
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // E-posta yerel kısmına göre rol doğrulaması (22194373@... → öğrenci)
        var roleCheckSource = !string.IsNullOrWhiteSpace(registerDto.Email)
            ? registerDto.Email.Split('@')[0]
            : registerDto.Username?.Trim() ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(roleCheckSource))
        {
            char firstChar = roleCheckSource.Trim()[0];
            if (char.IsDigit(firstChar))
            {
                if (registerDto.Role != UserRole.Student)
                {
                    return BadRequest(new { message = "Öğrenci e-posta adresleri yalnızca öğrenci olarak kayıt olabilir." });
                }
            }
            else if (registerDto.Role == UserRole.Student)
            {
                return BadRequest(new { message = "Akademik personel e-posta adresleri öğrenci olarak kayıt olamaz." });
            }
        }

        try
        {
            var result = await _authService.RegisterAsync(registerDto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException dbEx)
        {
            return StatusCode(500, ApiErrorHelper.ServerError(_environment, dbEx, "Kayıt işlemi sırasında veritabanı hatası oluştu."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiErrorHelper.ServerError(_environment, ex, "Kayıt işlemi sırasında bir hata oluştu."));
        }
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        // Request body null kontrolü
        if (loginDto == null)
        {
            return BadRequest(new { message = "Request body boş olamaz." });
        }

        // ModelState validation kontrolü
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _authService.LoginAsync(loginDto);

            if (result == null)
                return Unauthorized(new { message = "Kullanıcı adı/e-posta veya şifre hatalı." });

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiErrorHelper.ServerError(_environment, ex, "Giriş işlemi sırasında bir hata oluştu."));
        }
    }

    /// <summary>
    /// Şifre sıfırlama talebi. E-posta yoksa bile aynı genel mesaj (enumeration azaltma).
    /// </summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "İstek gövdesi boş olamaz." });
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var devResetLink = await _authService.RequestPasswordResetAsync(dto.Email);
            var response = new Dictionary<string, object>
            {
                ["message"] =
                    "Bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderilmiştir. Gelen kutunuzu ve spam klasörünü kontrol edin."
            };

            if (_environment.IsDevelopment() && !string.IsNullOrWhiteSpace(devResetLink))
            {
                response["devResetLink"] = devResetLink;
                response["message"] =
                    "Development modu: SMTP yapılandırılmadığı için e-posta gönderilmedi. Aşağıdaki bağlantıyı kullanarak şifrenizi sıfırlayabilirsiniz.";
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, ApiErrorHelper.ServerError(_environment, ex, "E-posta gönderilirken bir hata oluştu."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiErrorHelper.ServerError(_environment, ex));
        }
    }

    /// <summary>
    /// E-postadaki token ile yeni şifre belirleme.
    /// </summary>
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequestDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "İstek gövdesi boş olamaz." });
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var ok = await _authService.ResetPasswordWithTokenAsync(dto.Token, dto.NewPassword);
            if (!ok)
            {
                return BadRequest(new
                {
                    message =
                        "Bağlantı geçersiz veya süresi dolmuş. Lütfen giriş sayfasından yeni bir şifre sıfırlama talebi oluşturun."
                });
            }

            return Ok(new { message = "Şifreniz başarıyla güncellendi." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiErrorHelper.ServerError(_environment, ex, "Şifre güncellenirken bir hata oluştu."));
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult> GetMyProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Geçersiz oturum." });
        }

        var user = await _authService.GetUserByIdAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı." });
        }

        return Ok(new
        {
            id = user.Id,
            name = user.Name,
            email = user.Email,
            role = user.Role.ToString(),
            studentNo = user.StudentNo,
            profileImage = user.ProfileImage,
            faculty = user.ProfileFaculty,
            department = user.ProfileDepartment,
            roomNumber = user.RoomNumber,
            phoneNumber = user.PhoneNumber,
            classLevel = user.ClassLevel,
            courses = user.Courses,
            firstLoginAt = user.FirstLoginAt,
            lastLoginAt = user.LastLoginAt,
        });
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult> UpdateMyProfile([FromBody] UpdateProfileDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new { message = "İstek gövdesi boş olamaz." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Geçersiz oturum." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı." });
        }

        if (dto.Name != null)
        {
            var trimmedName = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(trimmedName))
            {
                user.Name = trimmedName;
            }
        }

        if (dto.ProfileImage != null)
        {
            if (dto.ProfileImage.Length > 0 && dto.ProfileImage.Length > 3_500_000)
            {
                return BadRequest(new { message = "Profil fotoğrafı çok büyük (en fazla ~2.5 MB)." });
            }

            // XSS koruması: Yalnızca güvenli resim formatlarına izin ver (SVG yasak)
            if (!string.IsNullOrWhiteSpace(dto.ProfileImage))
            {
                var allowedPrefixes = new[] {
                    "data:image/jpeg;base64,",
                    "data:image/jpg;base64,",
                    "data:image/png;base64,",
                    "data:image/webp;base64,",
                    "data:image/gif;base64,"
                };
                if (!allowedPrefixes.Any(p => dto.ProfileImage.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
                {
                    return BadRequest(new { message = "Geçersiz resim formatı. Yalnızca JPEG, PNG, WebP veya GIF kabul edilir." });
                }
            }

            user.ProfileImage = string.IsNullOrWhiteSpace(dto.ProfileImage) ? null : dto.ProfileImage;
        }

        if (dto.Faculty != null)
        {
            user.ProfileFaculty = string.IsNullOrWhiteSpace(dto.Faculty) ? null : dto.Faculty.Trim();
        }

        if (dto.Department != null)
        {
            user.ProfileDepartment = string.IsNullOrWhiteSpace(dto.Department) ? null : dto.Department.Trim();
        }

        if (dto.RoomNumber != null)
        {
            user.RoomNumber = string.IsNullOrWhiteSpace(dto.RoomNumber) ? null : dto.RoomNumber.Trim();
        }

        if (dto.PhoneNumber != null)
        {
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        }

        if (dto.ClassLevel != null)
        {
            user.ClassLevel = string.IsNullOrWhiteSpace(dto.ClassLevel) ? null : dto.ClassLevel.Trim();
        }

        if (dto.StudentNo != null)
        {
            user.StudentNo = string.IsNullOrWhiteSpace(dto.StudentNo) ? null : dto.StudentNo.Trim();
        }

        if (dto.Courses != null)
        {
            if (string.IsNullOrWhiteSpace(dto.Courses))
            {
                user.Courses = null;
            }
            else
            {
                var cleaned = dto.Courses
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
                user.Courses = cleaned.Length > 0 ? string.Join(", ", cleaned) : null;
            }
        }

        try
        {
            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Profil bilgileri güncellendi.",
                id = user.Id,
                name = user.Name,
                email = user.Email,
                role = user.Role.ToString(),
                studentNo = user.StudentNo,
                profileImage = user.ProfileImage,
                faculty = user.ProfileFaculty,
                department = user.ProfileDepartment,
                roomNumber = user.RoomNumber,
                phoneNumber = user.PhoneNumber,
                classLevel = user.ClassLevel,
                courses = user.Courses,
                firstLoginAt = user.FirstLoginAt,
                lastLoginAt = user.LastLoginAt,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profil güncellenirken hata: UserId={UserId}", userId);
            return StatusCode(500, new { message = "Profil güncellenirken bir hata oluştu." });
        }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new { message = "İstek gövdesi boş olamaz." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Geçersiz oturum." });
        }

        try
        {
            var (success, error) = await _authService.ChangePasswordAsync(userId, dto.CurrentPassword, dto.NewPassword);
            if (!success)
            {
                return BadRequest(new { message = error ?? "Şifre değiştirilemedi." });
            }

            return Ok(new { message = "Şifreniz başarıyla güncellendi." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Şifre değiştirme hatası: UserId={UserId}", userId);
            return StatusCode(500, new { message = "Şifre değişirken bir hata oluştu." });
        }
    }

    /// <summary>
    /// Tüm kullanıcıları listeler (yalnızca SuperAdmin)
    /// </summary>
    [HttpGet("users")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<List<UserResponseDto>>> GetAllUsers()
    {
        try
        {
            var users = await _context.Users
                .Select(u => new UserResponseDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Role = u.Role.ToString(),
                    StudentNo = u.StudentNo
                })
                .OrderBy(u => u.Name)
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kullanıcılar getirilirken hata");
            return StatusCode(500, new { message = "Kullanıcılar getirilirken bir hata oluştu." });
        }
    }

    /// <summary>
    /// Öğretim elemanlarını listeler (bölüm/ad arama, fakülte FK filtreleri, randevu görünürlüğü).
    /// </summary>
    [HttpGet("teachers")]
    public async Task<ActionResult> GetAllTeachers(
        [FromQuery] string? department,
        [FromQuery] string? search,
        [FromQuery] int? facultyId,
        [FromQuery] int? departmentId)
    {
        try
        {
            var teachersQuery = _context.Users
                .AsNoTracking()
                .Include(u => u.Department)
                .Where(u => u.Role == UserRole.Teacher && u.IsActive && u.IsVisibleForAppointment);

            if (departmentId.HasValue)
            {
                var selectedDepartment = await _context.Departments
                    .AsNoTracking()
                    .Include(d => d.Faculty)
                    .FirstOrDefaultAsync(d => d.Id == departmentId.Value && d.IsActive && d.Faculty.IsActive);

                if (selectedDepartment == null)
                {
                    return Ok(Array.Empty<object>());
                }

                var deptNameLower = selectedDepartment.Name.ToLower();
                teachersQuery = teachersQuery.Where(u =>
                    (u.DepartmentId == departmentId.Value &&
                     u.Department != null &&
                     u.Department.IsActive &&
                     u.Department.Faculty.IsActive) ||
                    (u.DepartmentId == null &&
                     u.ProfileDepartment != null &&
                     u.ProfileDepartment.ToLower() == deptNameLower) ||
                    (u.DepartmentId == null &&
                     u.ProfileDepartment == null &&
                     u.Department == null));
            }
            else if (facultyId.HasValue)
            {
                teachersQuery = teachersQuery.Where(u =>
                    u.Department != null &&
                    u.Department.FacultyId == facultyId.Value &&
                    u.Department.IsActive &&
                    u.Department.Faculty.IsActive);
            }
            else if (!string.IsNullOrWhiteSpace(department))
            {
                var dep = department.Trim().ToLower();
                teachersQuery = teachersQuery.Where(u =>
                    (u.ProfileDepartment != null && u.ProfileDepartment.ToLower() == dep) ||
                    (u.Department != null && u.Department.Name.ToLower() == dep));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var prefix = search.Trim().ToLower();
                teachersQuery = teachersQuery.Where(u =>
                    u.Name.ToLower().StartsWith(prefix) ||
                    u.Name.ToLower().Contains(" " + prefix));
            }

            var teachers = await teachersQuery
                .OrderBy(u => u.Name)
                .Select(u => new
                {
                    id = u.Id,
                    name = u.Name,
                    role = u.Role.ToString(),
                    studentNo = u.StudentNo,
                    department = u.ProfileDepartment ?? (u.Department != null ? u.Department.Name : null),
                    roomNumber = u.RoomNumber,
                    phoneNumber = u.PhoneNumber,
                    profileImage = u.ProfileImage,
                    courses = u.Courses,
                })
                .ToListAsync();

            if (teachers.Count == 0 && departmentId.HasValue)
            {
                var fallbackDepartment = await _context.Departments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.Id == departmentId.Value && d.IsActive);
                if (fallbackDepartment != null)
                {
                    teachers = await _context.Users
                        .AsNoTracking()
                        .Include(u => u.Department)
                        .Where(u => u.Role == UserRole.Teacher && u.IsActive && u.IsVisibleForAppointment &&
                                    (u.DepartmentId == null ||
                                     (u.Department != null && u.Department.FacultyId == fallbackDepartment.FacultyId)))
                        .OrderBy(u => u.Name)
                        .Select(u => new
                        {
                            id = u.Id,
                            name = u.Name,
                            role = u.Role.ToString(),
                            studentNo = u.StudentNo,
                            department = u.ProfileDepartment ?? (u.Department != null ? u.Department.Name : null),
                            roomNumber = u.RoomNumber,
                            phoneNumber = u.PhoneNumber,
                            profileImage = u.ProfileImage,
                            courses = u.Courses,
                        })
                        .ToListAsync();
                }
            }

            return Ok(teachers);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Öğretmenler getirilirken bir hata oluştu.", error = ex.Message });
        }
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<string>>> GetTeacherDepartments()
    {
        try
        {
            var fromProfile = _context.Users
                .AsNoTracking()
                .Where(u => u.Role == UserRole.Teacher && u.ProfileDepartment != null && u.ProfileDepartment != "")
                .Select(u => u.ProfileDepartment!);

            var fromAssigned = _context.Users
                .AsNoTracking()
                .Where(u => u.Role == UserRole.Teacher && u.Department != null)
                .Select(u => u.Department!.Name);

            var fromCatalog = _context.Departments
                .AsNoTracking()
                .Where(d => d.IsActive)
                .Select(d => d.Name);

            var departments = await fromProfile
                .Union(fromAssigned)
                .Union(fromCatalog)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();

            return Ok(departments);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Bölümler getirilirken bir hata oluştu.", error = ex.Message });
        }
    }

    [HttpGet("teachers/{id:int}/courses")]
    public async Task<ActionResult<List<string>>> GetTeacherCourses(int id)
    {
        try
        {
            var teacher = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Teacher);

            if (teacher == null)
            {
                return NotFound(new { message = "Öğretim elemanı bulunamadı." });
            }

            var coursesList = (teacher.Courses ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .ToList();

            return Ok(coursesList);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Dersler getirilirken bir hata oluştu.", error = ex.Message });
        }
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token, [FromQuery] int userId)
    {
        // Frontend URL'ini environment variable'dan al (Docker için)
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
        
        if (string.IsNullOrEmpty(token) || userId <= 0)
        {
            var errorHtml = @"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Doğrulama Hatası</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .error-icon { font-size: 64px; color: #ff4444; margin-bottom: 20px; }
                        h1 { color: #ff4444; margin-bottom: 20px; }
                        p { color: #666; line-height: 1.6; font-size: 16px; }
                        .button { display: inline-block; margin-top: 20px; padding: 12px 30px; background: #d71920; color: white; text-decoration: none; border-radius: 5px; }
                        .button:hover { background: #b01519; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='error-icon'>⚠️</div>
                        <h1>Geçersiz Doğrulama İsteği</h1>
                        <p>Doğrulama linki hatalı veya eksik bilgi içeriyor.</p>
                        <p>Lütfen e-postanızdaki doğrulama linkine tekrar tıklayın veya yeni bir doğrulama e-postası isteyin.</p>
                        <a href='{frontendUrl}' class='button'>Giriş Sayfasına Dön</a>
                    </div>
                </body>
                </html>";
            return Content(errorHtml, "text/html; charset=utf-8");
        }

        var result = await _authService.VerifyEmailAsync(token, userId);

        if (result)
        {
            var successHtml = @"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>E-posta Doğrulandı</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                        .success-icon { font-size: 64px; margin-bottom: 20px; }
                        h1 { color: #4CAF50; margin-bottom: 20px; }
                        p { color: #666; line-height: 1.6; font-size: 16px; margin: 15px 0; }
                        .button { display: inline-block; margin-top: 30px; padding: 15px 40px; background: #d71920; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                        .button:hover { background: #b01519; transform: translateY(-2px); transition: all 0.3s; }
                        .info-box { background: #f0f8ff; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #4CAF50; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='success-icon'>✅</div>
                        <h1>E-posta Başarıyla Doğrulandı!</h1>
                        <p>Tebrikler! Hesabınız başarıyla aktifleştirildi.</p>
                        <div class='info-box'>
                            <p><strong>Artık giriş yapabilirsiniz!</strong></p>
                            <p>Kullanıcı adınız ve şifrenizle sisteme giriş yaparak tüm özellikleri kullanmaya başlayabilirsiniz.</p>
                        </div>
                        <a href='{frontendUrl}' class='button'>Giriş Yap</a>
                    </div>
                </body>
                </html>";
            return Content(successHtml, "text/html; charset=utf-8");
        }
        
        var failureHtml = @"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Doğrulama Başarısız</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .error-icon { font-size: 64px; color: #ff9800; margin-bottom: 20px; }
                    h1 { color: #ff9800; margin-bottom: 20px; }
                    p { color: #666; line-height: 1.6; font-size: 16px; }
                    .button { display: inline-block; margin-top: 20px; padding: 12px 30px; background: #d71920; color: white; text-decoration: none; border-radius: 5px; }
                    .button:hover { background: #b01519; }
                    ul { text-align: left; display: inline-block; margin-top: 15px; }
                    li { margin: 10px 0; color: #666; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='error-icon'>❌</div>
                    <h1>E-posta Doğrulanamadı</h1>
                    <p>Doğrulama işlemi başarısız oldu.</p>
                    <p><strong>Olası Sebepler:</strong></p>
                    <ul>
                        <li>Doğrulama linki geçersiz veya süresi dolmuş olabilir</li>
                        <li>Bu hesap daha önce doğrulanmış olabilir</li>
                        <li>Sunucu yeniden başlatılmış olabilir</li>
                    </ul>
                    <p style='margin-top: 20px;'><strong>Çözüm:</strong> Lütfen tekrar kayıt olun veya destek ekibiyle iletişime geçin.</p>
                    <a href='{frontendUrl}' class='button'>Giriş Sayfasına Dön</a>
                </div>
            </body>
            </html>";
        return Content(failureHtml, "text/html; charset=utf-8");
    }
    [HttpGet("debug-schema")]
    public IActionResult DebugSchema()
    {
        if (!_environment.IsDevelopment())
        {
            return NotFound();
        }

        try 
        {
            var columns = new List<string>();
            var connection = _context.Database.GetDbConnection();
            connection.Open();
            
            using (var command = connection.CreateCommand())
            {
                // Enum değerlerini sorgula
                command.CommandText = "SELECT unnest(enum_range(NULL::login_type))";
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                         columns.Add($"ENUM VALUE: {reader.GetValue(0)}");
                    }
                }
            }
            connection.Close();
            
            return Ok(columns);
        }
        catch(Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}


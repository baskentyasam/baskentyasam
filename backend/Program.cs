using ApiProject.Services;
using ApiProject.Data;
using ApiProject.Services.Background;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Serilog;
using ApiProject.Hubs;
using System.Text.Json.Serialization;

// Serilog yapılandırması
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/error.log", rollingInterval: RollingInterval.Day, restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Error)
    .CreateLogger();

try
{
    // PostgreSQL tarih formatı hatasını engellemek için:
    AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

    var builder = WebApplication.CreateBuilder(args);

    // Serilog'u kullan
    builder.Host.UseSerilog();

    // Add services to the container.
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            // Frontend'in status/role gibi enum alanlarını string olarak beklemesi için
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
        {
            Title = "Bitirme Backend API",
            Version = "v1"
        });

        // JWT Token desteği için
        options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
            Name = "Authorization",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });

        options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            {
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });
    builder.Services.AddSignalR();

    // Entity Framework Core - PostgreSQL yapılandırması
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null);
        }));

    // JWT Authentication yapılandırması
    var jwtSettings = builder.Configuration.GetSection("Jwt");
    var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey bulunamadı.");

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };

        // SignalR için JWT token desteği
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                
                // SignalR hub istekleri için token'ı query string'den al
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/notificationHub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

    builder.Services.AddAuthorization();

    // Servisleri Dependency Injection'a ekle
    builder.Services.AddScoped<INotificationService, NotificationService>();
    builder.Services.AddScoped<IAppointmentService, AppointmentService>();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IEmailService, EmailService>(); // Email Service eklendi
    builder.Services.AddScoped<ICafeService, CafeService>();
    builder.Services.AddScoped<IOrderManagementService, OrderManagementService>();
    builder.Services.AddScoped<ScheduleService>();
    builder.Services.AddScoped<IOccupancyService, OccupancyService>();

    // Background Service
    builder.Services.AddHostedService<OrderCleanupService>();

    // CORS yapılandırması (Frontend bağlantısı için)
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAll", policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000", 
                    "http://localhost:5173", 
                    "http://localhost:4200", 
                    "http://localhost:8080",
                    "http://baskent_web",
                    "http://web"
                  )
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials(); // SignalR ve cookie desteği için
        });
    });

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // Docker ortamında HTTPS yönlendirmesini devre dışı bırak
    var disableHttpsRedirection = builder.Configuration.GetValue<bool>("DisableHttpsRedirection", false);
    if (!disableHttpsRedirection && !app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    app.UseCors("AllowAll");

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<NotificationHub>("/notificationHub");

    // --- MIGRATION VE BAŞLANGIÇ VERİLERİNİ YÜKLEME KODU ---
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<ApiProject.Data.AppDbContext>();
            
            // Migration'ları otomatik uygula (arkadaşlarınız için)
            context.Database.Migrate();
            
            // request_reason kolonunu ekle (eğer yoksa) - async/await kullan
            try
            {
                var connection = context.Database.GetDbConnection();
                var wasOpen = connection.State == System.Data.ConnectionState.Open;
                if (!wasOpen)
                {
                    await connection.OpenAsync();
                }
                try
                {
                    // 1. request_reason kolonunu kontrol et/ekle
                    using var command = connection.CreateCommand();
                    command.CommandText = @"
                        DO $$ 
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 
                                FROM information_schema.columns 
                                WHERE table_name = 'appointments' 
                                AND column_name = 'request_reason'
                            ) THEN
                                ALTER TABLE ""appointments"" 
                                ADD COLUMN ""request_reason"" TEXT;
                                RAISE NOTICE 'request_reason kolonu eklendi.';
                            END IF;
                        END $$;
                    ";
                    await command.ExecuteNonQueryAsync();
                    Console.WriteLine("request_reason kolonu kontrol edildi/eklendi.");
                    
                    // 1b. rejection_reason kolonunu kontrol et/ekle
                    using var rejectionReasonCmd = connection.CreateCommand();
                    rejectionReasonCmd.CommandText = @"
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1
                                FROM information_schema.columns
                                WHERE table_name = 'appointments'
                                AND column_name = 'rejection_reason'
                            ) THEN
                                ALTER TABLE ""appointments""
                                ADD COLUMN ""rejection_reason"" TEXT;
                                RAISE NOTICE 'rejection_reason kolonu eklendi.';
                            END IF;
                        END $$;
                    ";
                    await rejectionReasonCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("rejection_reason kolonu kontrol edildi/eklendi.");
                    
                    // 2. login_type enum'unu kontrol et/düzelt
                    using var loginTypeCommand = connection.CreateCommand();
                    loginTypeCommand.CommandText = @"
                        DO $$ 
                        BEGIN
                            -- Önce login_type kolonunun var olup olmadığını kontrol et
                            IF NOT EXISTS (
                                SELECT 1 
                                FROM information_schema.columns 
                                WHERE table_name = 'users' 
                                AND column_name = 'login_type'
                            ) THEN
                                -- Kolon yoksa oluştur
                                CREATE TYPE login_type AS ENUM ('school_email', 'staff_id');
                                ALTER TABLE users ADD COLUMN login_type login_type;
                                RAISE NOTICE 'login_type kolonu ve enum tipi oluşturuldu.';
                            ELSE
                                -- Kolon varsa, enum değerlerini kontrol et
                                IF EXISTS (
                                    SELECT 1 
                                    FROM pg_enum 
                                    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
                                    WHERE pg_type.typname = 'login_type' 
                                    AND pg_enum.enumlabel IN ('Student', 'Teacher')
                                ) THEN
                                    -- Yanlış enum değerleri varsa düzelt
                                    RAISE NOTICE 'login_type enum değerleri yanlış, düzeltiliyor...';
                                    ALTER TABLE users ALTER COLUMN login_type DROP DEFAULT;
                                    ALTER TABLE users ALTER COLUMN login_type TYPE text USING login_type::text;
                                    DROP TYPE login_type CASCADE;
                                    CREATE TYPE login_type AS ENUM ('school_email', 'staff_id');
                                    ALTER TABLE users ALTER COLUMN login_type TYPE login_type USING 
                                        CASE 
                                            WHEN login_type::text IN ('Student', 'Teacher') THEN NULL::login_type
                                            ELSE login_type::login_type
                                        END;
                                    RAISE NOTICE 'login_type enum değerleri düzeltildi.';
                                END IF;
                            END IF;
                        END $$;
                    ";
                    await loginTypeCommand.ExecuteNonQueryAsync();
                    Console.WriteLine("login_type enum kontrol edildi/düzeltildi.");

                    // 3. Kullanıcı profil alanları (idempotent)
                    using var profileColumnsCmd = connection.CreateCommand();
                    profileColumnsCmd.CommandText = @"
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'profile_image'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""profile_image"" TEXT;
                                RAISE NOTICE 'profile_image kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'department'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""department"" VARCHAR(200);
                                RAISE NOTICE 'department kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'room_number'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""room_number"" VARCHAR(50);
                                RAISE NOTICE 'room_number kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'phone_number'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""phone_number"" VARCHAR(50);
                                RAISE NOTICE 'phone_number kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'class_level'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""class_level"" VARCHAR(20);
                                RAISE NOTICE 'class_level kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'courses'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""courses"" TEXT;
                                RAISE NOTICE 'courses kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'first_login_at'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""first_login_at"" TIMESTAMP WITHOUT TIME ZONE;
                                RAISE NOTICE 'first_login_at kolonu eklendi.';
                            END IF;

                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'users' AND column_name = 'last_login_at'
                            ) THEN
                                ALTER TABLE ""users"" ADD COLUMN ""last_login_at"" TIMESTAMP WITHOUT TIME ZONE;
                                RAISE NOTICE 'last_login_at kolonu eklendi.';
                            END IF;
                        END $$;
                    ";
                    await profileColumnsCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("Kullanıcı profil kolonları kontrol edildi/eklendi.");

                    // 4. Doluluk sensör eventleri tablosu (idempotent)
                    using var sensorEventTableCmd = connection.CreateCommand();
                    sensorEventTableCmd.CommandText = @"
                        CREATE TABLE IF NOT EXISTS ""OccupancySensorEvents"" (
                            ""Id"" SERIAL PRIMARY KEY,
                            ""ZoneName"" VARCHAR(100) NOT NULL,
                            ""FromTime"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                            ""ToTime"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                            ""InCount"" INTEGER NOT NULL,
                            ""OutCount"" INTEGER NOT NULL,
                            ""ReceivedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                        );

                        CREATE INDEX IF NOT EXISTS ""IX_OccupancySensorEvents_Zone_ReceivedAt""
                            ON ""OccupancySensorEvents"" (""ZoneName"", ""ReceivedAt"");
                    ";
                    await sensorEventTableCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("OccupancySensorEvents tablosu kontrol edildi/oluşturuldu.");
                }
                finally
                {
                    if (!wasOpen)
                    {
                        await connection.CloseAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"request_reason kolonu eklenirken hata oluştu (zaten var olabilir): {ex.Message}");
            }
            
            // Veritabanını oluştur ve verileri bas
            ApiProject.Data.DbInitializer.Initialize(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Veri yüklenirken hata oluştu: " + ex.Message);
        }
    }
    // -----------------------------------------

    Log.Information("Uygulama başlatılıyor...");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Uygulama başlatılırken kritik hata oluştu.");
}
finally
{
    Log.CloseAndFlush();
}

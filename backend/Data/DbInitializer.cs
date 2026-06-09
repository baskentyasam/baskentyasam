using ApiProject.Models;
using ApiProject.Services;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace ApiProject.Data
{
    public static class DbInitializer
    {
        private const int MinSuperAdminPasswordLength = 12;

        public static void Initialize(AppDbContext context, IHostEnvironment environment)
        {
            context.Database.EnsureCreated();

            EnsureUserProfileFacultyColumn(context);

            EnsureRoleCatalogRecords(context);
            DeactivateLegacyAdmins(context);

            if (environment.IsDevelopment())
            {
                SeedDevelopmentUsers(context);
                EnsureDevelopmentSeedLoginTypes(context);
            }
            else
            {
                EnsureProductionSuperAdmin(context);
            }

            // 2. KAFETERYA SEED (idempotent)
            EnsureCafeteria(context, "Pergel Kafe", "Merkez Kampüs", "Merkezi öğrenci kafeteryası.");
            EnsureCafeteria(context, "Sanat Kafe", "Mühendislik/Sanat Yerleşkesi", "Sanat ve mühendislik bölgesine hizmet veren kafe.");
            EnsureCafeteria(context, "Hazırlık Kafe", "Hazırlık Binası", "Hazırlık öğrencilerine yakın kafe.");

            if (environment.IsDevelopment())
            {
                SeedDevelopmentCafeteriaSubAdmins(context);
            }

            // 3. OTOPARK SEED (idempotent)
            EnsureParkingLot(context, "Hazırlık Otopark", "Hazırlık Binası Girişi", 250, 90);
            EnsureParkingLot(context, "Mühendislik Otopark", "Mühendislik Fakültesi", 300, 110);
            EnsureParkingLot(context, "Ana Giriş Otopark", "Ana Kampüs Girişi", 400, 160);

            EnsureFacultyDepartments(context);
            EnsureDevelopmentTeacherDepartments(context);
            EnsureLibraryFloors(context);

            var pergelCafeteria = context.Cafeterias.First(c => c.Name == "Pergel Kafe");

            // 4. MENÜYÜ EKLE
            if (!context.MenuItems.Any())
            {
                var menuItems = new MenuItem[]
                {
                    new MenuItem { Name = "Hamburger", Price = 150, Description = "Klasik", IsAvailable = true, CafeteriaId = pergelCafeteria.Id },
                    new MenuItem { Name = "Tost", Price = 50, Description = "Kaşarlı", IsAvailable = true, CafeteriaId = pergelCafeteria.Id },
                    new MenuItem { Name = "Çay", Price = 10, Description = "Taze", IsAvailable = true, CafeteriaId = pergelCafeteria.Id }
                };
                context.MenuItems.AddRange(menuItems);
                context.SaveChanges();
            }
            else
            {
                var menuWithoutCafeteria = context.MenuItems.Where(m => m.CafeteriaId == null).ToList();
                if (menuWithoutCafeteria.Count > 0)
                {
                    foreach (var menuItem in menuWithoutCafeteria)
                    {
                        menuItem.CafeteriaId = pergelCafeteria.Id;
                    }
                    context.SaveChanges();
                }
            }

            if (environment.IsDevelopment())
            {
                SeedDevelopmentSampleOrder(context, pergelCafeteria);
            }

            if (context.Orders.Any())
            {
                var ordersWithoutCafeteria = context.Orders.Where(o => o.CafeteriaId == null).ToList();
                if (ordersWithoutCafeteria.Count > 0)
                {
                    foreach (var order in ordersWithoutCafeteria)
                    {
                        order.CafeteriaId = pergelCafeteria.Id;
                    }
                    context.SaveChanges();
                }
            }
        }

        private static void EnsureUserProfileFacultyColumn(AppDbContext context)
        {
            context.Database.ExecuteSqlRaw(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_faculty text;");
        }

        private static void SeedDevelopmentUsers(AppDbContext context)
        {
            // Idempotent: veritabanında başka kullanıcılar olsa bile eksik demo hesaplar eklenir.
            EnsureDevelopmentSeedUser(
                context,
                email: "22194301@baskent.edu.tr",
                name: "Ali Öğrenci",
                role: UserRole.Student,
                password: "baskent123",
                studentNo: "22194301");
            EnsureDevelopmentSeedUser(
                context,
                email: "hoca@baskent.edu.tr",
                name: "Mehmet Hoca",
                role: UserRole.Teacher,
                password: "baskent123");
            EnsureDevelopmentSeedUser(
                context,
                email: "personel@baskent.edu.tr",
                name: "Ayşe Personel",
                role: UserRole.Personnel,
                password: "baskent123");

            if (!context.Users.Any(u => u.Name.ToLower().Trim() == "kasiyer"))
            {
                var cashier = new User
                {
                    Name = "kasiyer",
                    Email = "kasiyer@baskent.edu.tr",
                    Role = UserRole.Staff,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    IsActive = true
                };

                context.Users.Add(cashier);
                context.SaveChanges();
            }

            var superAdmin = context.Users.FirstOrDefault(u => u.Email.ToLower() == "systemadmin@baskentyasam.com");
            if (superAdmin == null)
            {
                superAdmin = new User
                {
                    Name = "Sistem Yöneticisi",
                    Email = "systemadmin@baskentyasam.com",
                    Role = UserRole.SuperAdmin,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    IsActive = true
                };

                context.Users.Add(superAdmin);
                context.SaveChanges();
            }
            else if (!superAdmin.IsActive || superAdmin.Role != UserRole.SuperAdmin)
            {
                superAdmin.IsActive = true;
                superAdmin.Role = UserRole.SuperAdmin;
                context.SaveChanges();
            }

            context.Database.ExecuteSqlRaw(
                "UPDATE users SET login_type = 'school_email'::login_type WHERE email = {0}",
                "systemadmin@baskentyasam.com");
        }

        private static void EnsureDevelopmentSeedUser(
            AppDbContext context,
            string email,
            string name,
            UserRole role,
            string password,
            string? studentNo = null)
        {
            var normalizedEmail = email.ToLower().Trim();
            var user = context.Users.FirstOrDefault(u => u.Email.ToLower() == normalizedEmail);
            if (user == null)
            {
                context.Users.Add(new User
                {
                    Name = name,
                    Email = email,
                    Role = role,
                    StudentNo = studentNo,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    IsActive = true,
                });
                context.SaveChanges();
                return;
            }

            var changed = false;
            if (!user.IsActive)
            {
                user.IsActive = true;
                changed = true;
            }

            if (user.Role != role)
            {
                user.Role = role;
                changed = true;
            }

            if (!string.IsNullOrWhiteSpace(studentNo) && user.StudentNo != studentNo)
            {
                user.StudentNo = studentNo;
                changed = true;
            }

            if (changed)
            {
                context.SaveChanges();
            }
        }

        private static void SeedDevelopmentCafeteriaSubAdmins(AppDbContext context)
        {
            EnsureDevelopmentCafeteriaSubAdmin(
                context,
                email: "pergel.altadmin@baskent.edu.tr",
                name: "Pergel Alt Admin",
                password: "baskent123",
                cafeteriaName: "Pergel Kafe");
            EnsureDevelopmentCafeteriaSubAdmin(
                context,
                email: "sanat.altadmin@baskent.edu.tr",
                name: "Sanat Alt Admin",
                password: "baskent123",
                cafeteriaName: "Sanat Kafe");
        }

        private static void EnsureDevelopmentCafeteriaSubAdmin(
            AppDbContext context,
            string email,
            string name,
            string password,
            string cafeteriaName)
        {
            var cafeteria = context.Cafeterias.FirstOrDefault(c => c.Name == cafeteriaName && c.IsActive);
            if (cafeteria == null)
            {
                return;
            }

            var createdById = context.Users
                .Where(u => u.Role == UserRole.SuperAdmin && u.IsActive)
                .Select(u => u.Id)
                .FirstOrDefault();
            if (createdById == 0)
            {
                createdById = context.Users.Select(u => u.Id).FirstOrDefault();
            }

            if (createdById == 0)
            {
                return;
            }

            var normalizedEmail = email.ToLower().Trim();
            var scopeKey = cafeteria.Id.ToString();

            var user = context.Users.FirstOrDefault(u => u.Email.ToLower() == normalizedEmail);
            if (user == null)
            {
                user = new User
                {
                    Name = name,
                    Email = email,
                    Role = UserRole.SubAdmin,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    IsActive = true,
                };
                context.Users.Add(user);
                context.SaveChanges();
            }
            else
            {
                var changed = false;
                if (user.Role != UserRole.SubAdmin)
                {
                    user.Role = UserRole.SubAdmin;
                    changed = true;
                }

                if (!user.IsActive)
                {
                    user.IsActive = true;
                    changed = true;
                }

                if (changed)
                {
                    context.SaveChanges();
                }
            }

            var assignments = context.AdminAssignments.Where(a => a.UserId == user.Id).ToList();
            var targetAssignment = assignments.FirstOrDefault(a =>
                a.ModuleType == AdminModuleType.Cafeteria && a.ScopeKey == scopeKey);

            if (targetAssignment == null)
            {
                foreach (var assignment in assignments.Where(a => a.IsActive))
                {
                    assignment.IsActive = false;
                }

                context.AdminAssignments.Add(new AdminAssignment
                {
                    UserId = user.Id,
                    ModuleType = AdminModuleType.Cafeteria,
                    ScopeKey = scopeKey,
                    ScopeDisplayName = cafeteria.Name,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = createdById,
                });
                context.SaveChanges();
            }
            else
            {
                targetAssignment.IsActive = true;
                targetAssignment.ScopeDisplayName = cafeteria.Name;

                foreach (var assignment in assignments.Where(a => a.Id != targetAssignment.Id && a.IsActive))
                {
                    assignment.IsActive = false;
                }

                context.SaveChanges();
            }

            context.Database.ExecuteSqlRaw(
                "UPDATE users SET login_type = 'school_email'::login_type WHERE id = {0}",
                user.Id);
        }

        private static void EnsureDevelopmentSeedLoginTypes(AppDbContext context)
        {
            var seedEmails = new[]
            {
                "22194301@baskent.edu.tr",
                "hoca@baskent.edu.tr",
                "personel@baskent.edu.tr",
                "pergel.altadmin@baskent.edu.tr",
                "sanat.altadmin@baskent.edu.tr",
                "systemadmin@baskentyasam.com",
            };

            foreach (var email in seedEmails)
            {
                context.Database.ExecuteSqlRaw(
                    """
                    UPDATE users
                    SET login_type = 'school_email'::login_type
                    WHERE lower(email) = lower({0})
                      AND login_type IS NULL
                    """,
                    email);
            }
        }

        private static void DeactivateLegacyAdmins(AppDbContext context)
        {
            var legacyAdmins = context.Users
                .Where(u => u.Role == UserRole.Admin || u.Email.ToLower() == "admin@baskent.edu.tr")
                .ToList();
            if (legacyAdmins.Count == 0)
            {
                return;
            }

            foreach (var legacyAdmin in legacyAdmins)
            {
                legacyAdmin.IsActive = false;
            }

            context.SaveChanges();
        }

        /// <summary>
        /// Production: SuperAdmin yalnızca env ile oluşturulur. Şifre zayıfsa veya eksikse seed atlanır (mevcut DB silinmez).
        /// </summary>
        private static void EnsureProductionSuperAdmin(AppDbContext context)
        {
            var email = Environment.GetEnvironmentVariable("SUPERADMIN_EMAIL")?.Trim();
            var password = Environment.GetEnvironmentVariable("SUPERADMIN_PASSWORD");
            var name = Environment.GetEnvironmentVariable("SUPERADMIN_NAME")?.Trim() ?? "Sistem Yöneticisi";

            var hasActiveSuperAdmin = context.Users.Any(u => u.Role == UserRole.SuperAdmin && u.IsActive);

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                if (!hasActiveSuperAdmin)
                {
                    Console.WriteLine("[WARN] Production: SUPERADMIN_EMAIL ve SUPERADMIN_PASSWORD ayarlanmadi; demo SuperAdmin olusturulmadi.");
                }
                return;
            }

            if (password.Length < MinSuperAdminPasswordLength)
            {
                Console.WriteLine($"[WARN] Production: SUPERADMIN_PASSWORD en az {MinSuperAdminPasswordLength} karakter olmali; SuperAdmin seed atlandi.");
                return;
            }

            var normalizedEmail = email.ToLower();
            var superAdmin = context.Users.FirstOrDefault(u => u.Email.ToLower() == normalizedEmail);
            if (superAdmin == null)
            {
                superAdmin = new User
                {
                    Name = name,
                    Email = normalizedEmail,
                    Role = UserRole.SuperAdmin,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    IsActive = true
                };
                context.Users.Add(superAdmin);
                context.SaveChanges();
                Console.WriteLine($"[INFO] Production: SuperAdmin hesabi olusturuldu ({normalizedEmail}).");
            }
            else if (!superAdmin.IsActive || superAdmin.Role != UserRole.SuperAdmin)
            {
                superAdmin.IsActive = true;
                superAdmin.Role = UserRole.SuperAdmin;
                context.SaveChanges();
            }

            context.Database.ExecuteSqlRaw(
                "UPDATE users SET login_type = 'school_email'::login_type WHERE email = {0}",
                normalizedEmail);
        }

        private static void SeedDevelopmentSampleOrder(AppDbContext context, Cafeteria pergelCafeteria)
        {
            if (context.Orders.Any())
            {
                return;
            }

            var ali = context.Users.FirstOrDefault(u => u.Email == "ali.ogrenci@baskent.edu.tr");
            var burger = context.MenuItems.FirstOrDefault(m => m.Name == "Hamburger");

            if (ali == null || burger == null)
            {
                return;
            }

            var order = new Order
            {
                UserId = ali.Id,
                UserType = OrderUserType.Student,
                CreatedAt = DateTime.UtcNow,
                OrderNumber = $"{DateTime.UtcNow:yyyyMMdd}-SEED",
                Status = OrderStatus.Preparing,
                IsPaid = false,
                TotalAmount = burger.Price,
                CafeteriaId = burger.CafeteriaId ?? pergelCafeteria.Id
            };

            context.Orders.Add(order);
            context.SaveChanges();

            context.OrderItems.Add(new OrderItem
            {
                OrderId = order.Id,
                MenuItemId = burger.Id,
                Quantity = 1,
                Price = burger.Price
            });
            context.SaveChanges();
        }

        private static void EnsureCafeteria(AppDbContext context, string name, string location, string description)
        {
            var cafeteria = context.Cafeterias.FirstOrDefault(c => c.Name == name);
            if (cafeteria == null)
            {
                context.Cafeterias.Add(new Cafeteria
                {
                    Name = name,
                    Location = location,
                    Description = description,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
                return;
            }

            cafeteria.IsActive = true;
            cafeteria.Location = location;
            cafeteria.Description = description;
            context.SaveChanges();
        }

        private static readonly (string Faculty, string[] Departments)[] FacultyDepartmentSeed =
        {
            ("Mühendislik Fakültesi", new[]
            {
                "Bilgisayar Mühendisliği",
                "Elektrik-Elektronik Mühendisliği",
                "Makine Mühendisliği",
                "Endüstri Mühendisliği",
            }),
            ("İktisadi ve İdari Bilimler Fakültesi", new[]
            {
                "İşletme",
                "İktisat",
                "Siyaset Bilimi ve Uluslararası İlişkiler",
            }),
            ("Fen-Edebiyat Fakültesi", new[]
            {
                "Psikoloji",
                "Sosyoloji",
                "Türk Dili ve Edebiyatı",
            }),
            ("Hukuk Fakültesi", new[] { "Hukuk" }),
            ("İletişim Fakültesi", new[]
            {
                "Halkla İlişkiler ve Tanıtım",
                "Radyo, Televizyon ve Sinema",
            }),
        };

        private static void EnsureDevelopmentTeacherDepartments(AppDbContext context)
        {
            var csDept = context.Departments.FirstOrDefault(d => d.Name == "Bilgisayar Mühendisliği");
            if (csDept == null)
            {
                return;
            }

            var teachers = context.Users
                .Where(u => u.Role == UserRole.Teacher && u.IsActive)
                .ToList();

            foreach (var teacher in teachers)
            {
                if (teacher.DepartmentId == null)
                {
                    teacher.DepartmentId = csDept.Id;
                }

                if (string.IsNullOrWhiteSpace(teacher.ProfileDepartment))
                {
                    teacher.ProfileDepartment = csDept.Name;
                }
            }

            if (teachers.Count > 0)
            {
                context.SaveChanges();
            }
        }

        private static void EnsureFacultyDepartments(AppDbContext context)
        {
            foreach (var (facultyName, departments) in FacultyDepartmentSeed)
            {
                var faculty = context.Faculties.FirstOrDefault(f => f.Name == facultyName);
                if (faculty == null)
                {
                    faculty = new Faculty
                    {
                        Name = facultyName,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                    };
                    context.Faculties.Add(faculty);
                    context.SaveChanges();
                }
                else
                {
                    faculty.IsActive = true;
                    context.SaveChanges();
                }

                foreach (var departmentName in departments)
                {
                    var department = context.Departments.FirstOrDefault(d =>
                        d.FacultyId == faculty.Id && d.Name == departmentName);
                    if (department == null)
                    {
                        context.Departments.Add(new Department
                        {
                            FacultyId = faculty.Id,
                            Name = departmentName,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                        });
                        context.SaveChanges();
                    }
                    else
                    {
                        department.IsActive = true;
                        context.SaveChanges();
                    }
                }
            }
        }

        private static void EnsureLibraryFloors(AppDbContext context)
        {
            if (!context.LibraryFloors.Any())
            {
                var legacyOccupancy = 0;
                if (context.LibraryAreas.Any())
                {
                    legacyOccupancy = context.LibraryAreas
                        .Where(a => a.IsActive)
                        .Select(a => a.CurrentOccupancy)
                        .FirstOrDefault();
                }

                context.LibraryFloors.AddRange(LibraryFloorSeed.DefaultFloors());
                context.LibraryStatuses.Add(new LibraryStatus
                {
                    Id = 1,
                    CurrentOccupancy = legacyOccupancy,
                    LastUpdatedAt = DateTime.UtcNow,
                    ScheduleMode = "normal",
                    ExamOpenFloorCodesJson = "[\"minus1\",\"ground\",\"floor1\",\"floor2\",\"h24\"]",
                });
                context.SaveChanges();
            }
        }

        private static void EnsureParkingLot(AppDbContext context, string name, string location, int capacity, int currentOccupancy)
        {
            var parkingLot = context.ParkingLots.FirstOrDefault(p => p.Name == name);
            if (parkingLot == null)
            {
                context.ParkingLots.Add(new ParkingLot
                {
                    Name = name,
                    Location = location,
                    Capacity = capacity,
                    CurrentOccupancy = currentOccupancy,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
                return;
            }

            parkingLot.IsActive = true;
            parkingLot.Location = location;
            if (parkingLot.Capacity <= 0) parkingLot.Capacity = capacity;
            if (parkingLot.CurrentOccupancy < 0) parkingLot.CurrentOccupancy = currentOccupancy;
            context.SaveChanges();
        }

        /// <summary>
        /// Bazı eski veritabanlarında users.role_id → roles FK vardır.
        /// EF migration'ları roles tablosunu oluşturmaz; bu yüntem yalnızca tablo+FK varsa 5/6 ekler.
        /// </summary>
        private static void EnsureRoleCatalogRecords(AppDbContext context)
        {
            var connection = context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose)
            {
                connection.Open();
            }

            try
            {
                if (!TableExists(connection, "roles"))
                {
                    return;
                }

                if (!UsersRoleIdReferencesRoles(connection))
                {
                    return;
                }

                var columns = GetTableColumns(connection, "roles");
                var idColumn = columns.FirstOrDefault(c => c.Equals("id", StringComparison.OrdinalIgnoreCase))
                    ?? columns.FirstOrDefault(c => c.EndsWith("_id", StringComparison.OrdinalIgnoreCase));
                if (idColumn == null)
                {
                    return;
                }

                var nameColumn = columns.FirstOrDefault(c =>
                    c.Equals("name", StringComparison.OrdinalIgnoreCase)
                    || c.Equals("role_name", StringComparison.OrdinalIgnoreCase)
                    || c.Equals("display_name", StringComparison.OrdinalIgnoreCase));

                InsertRoleIfMissing(connection, idColumn, nameColumn, 5, "SuperAdmin");
                InsertRoleIfMissing(connection, idColumn, nameColumn, 6, "SubAdmin");
                InsertRoleIfMissing(connection, idColumn, nameColumn, 7, "Personnel");
            }
            finally
            {
                if (shouldClose && connection.State == ConnectionState.Open)
                {
                    connection.Close();
                }
            }
        }

        private static bool TableExists(DbConnection connection, string tableName)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = @tableName
                );
                """;
            AddParameter(cmd, "tableName", tableName);
            return Convert.ToBoolean(cmd.ExecuteScalar());
        }

        private static bool UsersRoleIdReferencesRoles(DbConnection connection)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = """
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class rel ON rel.oid = c.conrelid
                    JOIN pg_class frel ON frel.oid = c.confrelid
                    JOIN pg_attribute a ON a.attrelid = c.conrelid
                        AND a.attnum = ANY(c.conkey)
                        AND NOT a.attisdropped
                    WHERE c.contype = 'f'
                      AND rel.relname = 'users'
                      AND frel.relname = 'roles'
                      AND a.attname = 'role_id'
                );
                """;
            return Convert.ToBoolean(cmd.ExecuteScalar());
        }

        private static List<string> GetTableColumns(DbConnection connection, string tableName)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = @tableName
                ORDER BY ordinal_position;
                """;
            AddParameter(cmd, "tableName", tableName);

            var columns = new List<string>();
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                columns.Add(reader.GetString(0));
            }

            return columns;
        }

        private static void InsertRoleIfMissing(
            DbConnection connection,
            string idColumn,
            string? nameColumn,
            int roleId,
            string roleName)
        {
            using var existsCmd = connection.CreateCommand();
            existsCmd.CommandText = $"""
                SELECT COUNT(1) FROM roles WHERE "{idColumn}" = @roleId;
                """;
            AddParameter(existsCmd, "roleId", roleId);
            var exists = Convert.ToInt32(existsCmd.ExecuteScalar()) > 0;
            if (exists)
            {
                return;
            }

            using var insertCmd = connection.CreateCommand();
            if (nameColumn != null)
            {
                insertCmd.CommandText = $"""
                    INSERT INTO roles ("{idColumn}", "{nameColumn}") VALUES (@roleId, @roleName);
                    """;
                AddParameter(insertCmd, "roleName", roleName);
            }
            else
            {
                insertCmd.CommandText = $"""
                    INSERT INTO roles ("{idColumn}") VALUES (@roleId);
                    """;
            }

            AddParameter(insertCmd, "roleId", roleId);
            insertCmd.ExecuteNonQuery();
        }

        private static void AddParameter(DbCommand command, string name, object value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value;
            command.Parameters.Add(parameter);
        }
    }
}

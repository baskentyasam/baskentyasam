using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class AddFacultyDepartmentInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "department_id",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_visible_for_appointment",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "faculties",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_faculties", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "departments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    faculty_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_departments", x => x.id);
                    table.ForeignKey(
                        name: "FK_departments_faculties_faculty_id",
                        column: x => x.faculty_id,
                        principalTable: "faculties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_department_id",
                table: "users",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_departments_faculty_id_name",
                table: "departments",
                columns: new[] { "faculty_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_faculties_name",
                table: "faculties",
                column: "name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_users_departments_department_id",
                table: "users",
                column: "department_id",
                principalTable: "departments",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            SeedFacultiesAndDepartments(migrationBuilder);
        }

        private static void SeedFacultiesAndDepartments(MigrationBuilder migrationBuilder)
        {
            var seedPairs = new (string Faculty, string[] Departments)[]
            {
                ("Mühendislik Fakültesi", new[] { "Bilgisayar Mühendisliği", "Elektrik-Elektronik Mühendisliği", "Makine Mühendisliği", "Endüstri Mühendisliği" }),
                ("İktisadi ve İdari Bilimler Fakültesi", new[] { "İşletme", "İktisat", "Siyaset Bilimi ve Uluslararası İlişkiler" }),
                ("Fen-Edebiyat Fakültesi", new[] { "Psikoloji", "Sosyoloji", "Türk Dili ve Edebiyatı" }),
                ("Hukuk Fakültesi", new[] { "Hukuk" }),
                ("İletişim Fakültesi", new[] { "Halkla İlişkiler ve Tanıtım", "Radyo, Televizyon ve Sinema" }),
            };

            foreach (var (faculty, departments) in seedPairs)
            {
                var facultyEscaped = faculty.Replace("'", "''");
                migrationBuilder.Sql($"""
                    INSERT INTO faculties (name, is_active, created_at)
                    SELECT '{facultyEscaped}', TRUE, NOW()
                    WHERE NOT EXISTS (SELECT 1 FROM faculties WHERE name = '{facultyEscaped}');
                    """);

                foreach (var department in departments)
                {
                    var departmentEscaped = department.Replace("'", "''");
                    migrationBuilder.Sql($"""
                        INSERT INTO departments (faculty_id, name, is_active, created_at)
                        SELECT f.id, '{departmentEscaped}', TRUE, NOW()
                        FROM faculties f
                        WHERE f.name = '{facultyEscaped}'
                          AND NOT EXISTS (
                              SELECT 1 FROM departments d
                              WHERE d.faculty_id = f.id AND d.name = '{departmentEscaped}'
                          );
                        """);
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_users_departments_department_id",
                table: "users");

            migrationBuilder.DropTable(
                name: "departments");

            migrationBuilder.DropTable(
                name: "faculties");

            migrationBuilder.DropIndex(
                name: "IX_users_department_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "department_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_visible_for_appointment",
                table: "users");
        }
    }
}

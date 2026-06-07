using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryFloorsInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_faculty text;");

            migrationBuilder.CreateTable(
                name: "library_floors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    max_capacity = table.Column<int>(type: "integer", nullable: false),
                    is_open = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_library_floors", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "library_status",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    current_occupancy = table.Column<int>(type: "integer", nullable: false),
                    last_updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_library_status", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_library_floors_code",
                table: "library_floors",
                column: "code",
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO library_floors (code, name, max_capacity, is_open, sort_order)
                SELECT 'minus1', '-1. Kat', 60, TRUE, 1
                WHERE NOT EXISTS (SELECT 1 FROM library_floors WHERE code = 'minus1');

                INSERT INTO library_floors (code, name, max_capacity, is_open, sort_order)
                SELECT 'ground', 'Giriş Kat', 80, TRUE, 2
                WHERE NOT EXISTS (SELECT 1 FROM library_floors WHERE code = 'ground');

                INSERT INTO library_floors (code, name, max_capacity, is_open, sort_order)
                SELECT 'floor1', '1. Kat', 100, TRUE, 3
                WHERE NOT EXISTS (SELECT 1 FROM library_floors WHERE code = 'floor1');

                INSERT INTO library_floors (code, name, max_capacity, is_open, sort_order)
                SELECT 'floor2', '2. Kat', 90, TRUE, 4
                WHERE NOT EXISTS (SELECT 1 FROM library_floors WHERE code = 'floor2');

                INSERT INTO library_floors (code, name, max_capacity, is_open, sort_order)
                SELECT 'h24', '7/24 Alanı', 120, TRUE, 5
                WHERE NOT EXISTS (SELECT 1 FROM library_floors WHERE code = 'h24');

                INSERT INTO library_status (id, current_occupancy, last_updated_at)
                SELECT 1,
                       COALESCE((SELECT current_occupancy FROM library_areas WHERE is_active = TRUE ORDER BY id LIMIT 1), 0),
                       NOW()
                WHERE NOT EXISTS (SELECT 1 FROM library_status WHERE id = 1);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "library_floors");

            migrationBuilder.DropTable(
                name: "library_status");
        }
    }
}

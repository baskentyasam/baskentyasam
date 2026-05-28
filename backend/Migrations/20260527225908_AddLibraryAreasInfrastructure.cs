using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryAreasInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "library_areas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                    current_occupancy = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_library_areas", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_library_areas_name",
                table: "library_areas",
                column: "name",
                unique: true);

            migrationBuilder.Sql(@"
                INSERT INTO library_areas (name, location, capacity, current_occupancy, is_active, created_at)
                SELECT 'Merkez Kütüphane', 'Merkez Kampüs', 400, 120, TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM library_areas WHERE name = 'Merkez Kütüphane');

                INSERT INTO library_areas (name, location, capacity, current_occupancy, is_active, created_at)
                SELECT 'Sessiz Çalışma Alanı', 'Merkez Kütüphane — 2. Kat', 80, 25, TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM library_areas WHERE name = 'Sessiz Çalışma Alanı');

                INSERT INTO library_areas (name, location, capacity, current_occupancy, is_active, created_at)
                SELECT 'Grup Çalışma Odaları', 'Merkez Kütüphane — 1. Kat', 60, 18, TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM library_areas WHERE name = 'Grup Çalışma Odaları');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "library_areas");
        }
    }
}

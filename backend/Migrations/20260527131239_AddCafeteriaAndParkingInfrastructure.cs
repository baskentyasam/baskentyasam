using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class AddCafeteriaAndParkingInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<int>(
                name: "CafeteriaId",
                table: "Orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CafeteriaId",
                table: "cafeteria_menu_items",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "cafeterias",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cafeterias", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "parking_lots",
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
                    table.PrimaryKey("PK_parking_lots", x => x.id);
                });

            migrationBuilder.Sql(@"
                INSERT INTO cafeterias (name, location, description, is_active, created_at)
                SELECT 'Pergel Kafe', 'Merkez Kampüs', 'Merkezi öğrenci kafeteryası.', TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM cafeterias WHERE name = 'Pergel Kafe');

                INSERT INTO cafeterias (name, location, description, is_active, created_at)
                SELECT 'Sanat Kafe', 'Mühendislik/Sanat Yerleşkesi', 'Sanat ve mühendislik bölgesine hizmet veren kafe.', TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM cafeterias WHERE name = 'Sanat Kafe');

                INSERT INTO cafeterias (name, location, description, is_active, created_at)
                SELECT 'Hazırlık Kafe', 'Hazırlık Binası', 'Hazırlık öğrencilerine yakın kafe.', TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM cafeterias WHERE name = 'Hazırlık Kafe');
            ");

            migrationBuilder.Sql(@"
                INSERT INTO parking_lots (name, location, capacity, current_occupancy, is_active, created_at)
                SELECT 'Hazırlık Otopark', 'Hazırlık Binası Girişi', 250, 90, TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM parking_lots WHERE name = 'Hazırlık Otopark');

                INSERT INTO parking_lots (name, location, capacity, current_occupancy, is_active, created_at)
                SELECT 'Mühendislik Otopark', 'Mühendislik Fakültesi', 300, 110, TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM parking_lots WHERE name = 'Mühendislik Otopark');

                INSERT INTO parking_lots (name, location, capacity, current_occupancy, is_active, created_at)
                SELECT 'Ana Giriş Otopark', 'Ana Kampüs Girişi', 400, 160, TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM parking_lots WHERE name = 'Ana Giriş Otopark');
            ");

            migrationBuilder.Sql(@"
                UPDATE cafeteria_menu_items
                SET ""CafeteriaId"" = (SELECT id FROM cafeterias WHERE name = 'Pergel Kafe' LIMIT 1)
                WHERE ""CafeteriaId"" IS NULL;

                UPDATE ""Orders""
                SET ""CafeteriaId"" = (SELECT id FROM cafeterias WHERE name = 'Pergel Kafe' LIMIT 1)
                WHERE ""CafeteriaId"" IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CafeteriaId",
                table: "Orders",
                column: "CafeteriaId");

            migrationBuilder.CreateIndex(
                name: "IX_cafeteria_menu_items_CafeteriaId",
                table: "cafeteria_menu_items",
                column: "CafeteriaId");

            migrationBuilder.CreateIndex(
                name: "IX_cafeterias_name",
                table: "cafeterias",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parking_lots_name",
                table: "parking_lots",
                column: "name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_cafeteria_menu_items_cafeterias_CafeteriaId",
                table: "cafeteria_menu_items",
                column: "CafeteriaId",
                principalTable: "cafeterias",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_cafeterias_CafeteriaId",
                table: "Orders",
                column: "CafeteriaId",
                principalTable: "cafeterias",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_cafeteria_menu_items_cafeterias_CafeteriaId",
                table: "cafeteria_menu_items");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_cafeterias_CafeteriaId",
                table: "Orders");

            migrationBuilder.DropTable(
                name: "cafeterias");

            migrationBuilder.DropTable(
                name: "parking_lots");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CafeteriaId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_cafeteria_menu_items_CafeteriaId",
                table: "cafeteria_menu_items");

            migrationBuilder.DropColumn(
                name: "CafeteriaId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CafeteriaId",
                table: "cafeteria_menu_items");

            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "users",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class RenameInstructorScheduleCourseColumnToCourseCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "course_name",
                table: "instructor_schedule",
                newName: "course_code");

            migrationBuilder.AddColumn<string>(
                name: "class_level",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "courses",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "department",
                table: "users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "first_login_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_login_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "phone_number",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "profile_image",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "room_number",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OccupancySensorEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZoneName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FromTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ToTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    InCount = table.Column<int>(type: "integer", nullable: false),
                    OutCount = table.Column<int>(type: "integer", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OccupancySensorEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OccupancySensorEvents_ZoneName_ReceivedAt",
                table: "OccupancySensorEvents",
                columns: new[] { "ZoneName", "ReceivedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OccupancySensorEvents");

            migrationBuilder.DropColumn(
                name: "class_level",
                table: "users");

            migrationBuilder.DropColumn(
                name: "courses",
                table: "users");

            migrationBuilder.DropColumn(
                name: "department",
                table: "users");

            migrationBuilder.DropColumn(
                name: "first_login_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "last_login_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "phone_number",
                table: "users");

            migrationBuilder.DropColumn(
                name: "profile_image",
                table: "users");

            migrationBuilder.DropColumn(
                name: "room_number",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "course_code",
                table: "instructor_schedule",
                newName: "course_name");
        }
    }
}

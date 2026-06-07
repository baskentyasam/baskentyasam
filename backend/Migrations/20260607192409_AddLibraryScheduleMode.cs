using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryScheduleMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "exam_open_floor_codes_json",
                table: "library_status",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "schedule_mode",
                table: "library_status",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "normal");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "exam_open_floor_codes_json",
                table: "library_status");

            migrationBuilder.DropColumn(
                name: "schedule_mode",
                table: "library_status");
        }
    }
}

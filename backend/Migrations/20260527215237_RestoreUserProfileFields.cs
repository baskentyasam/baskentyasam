using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ApiProject.Migrations
{
    /// <inheritdoc />
    public partial class RestoreUserProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "profile_department",
                table: "users",
                type: "text",
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "class_level",
                table: "users");

            migrationBuilder.DropColumn(
                name: "courses",
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
                name: "profile_department",
                table: "users");

            migrationBuilder.DropColumn(
                name: "profile_image",
                table: "users");

            migrationBuilder.DropColumn(
                name: "room_number",
                table: "users");
        }
    }
}

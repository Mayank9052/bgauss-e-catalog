using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BGAUSS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetColumns : Migration
    {
        /// <inheritdoc />
        /// <summary>
        /// This method defines the operations to apply the migration, which in this case involves altering the "PasswordResetToken" column in the "Users" table to change its type and constraints. It specifies how the database schema should be modified when this migration is applied.
         
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PasswordResetToken",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PasswordResetToken",
                table: "Users",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}

using System.Text.RegularExpressions;

namespace ApiProject.Helpers;

public static class PasswordPolicy
{
    public const int MinLength = 8;
    public const int MaxLength = 15;

    public const string ErrorMessage =
        "Şifre 8-15 karakter olmalı; en az bir harf, bir rakam ve bir özel karakter içermelidir.";

    public static (bool IsValid, string? Error) Validate(string? password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return (false, ErrorMessage);
        }

        if (password.Length < MinLength || password.Length > MaxLength)
        {
            return (false, ErrorMessage);
        }

        if (!Regex.IsMatch(password, @"[a-zA-Z]"))
        {
            return (false, ErrorMessage);
        }

        if (!Regex.IsMatch(password, @"[0-9]"))
        {
            return (false, ErrorMessage);
        }

        if (!Regex.IsMatch(password, @"[^a-zA-Z0-9]"))
        {
            return (false, ErrorMessage);
        }

        return (true, null);
    }
}

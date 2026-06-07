using System.ComponentModel.DataAnnotations;

namespace ApiProject.Helpers;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class PasswordPolicyAttribute : ValidationAttribute
{
    public PasswordPolicyAttribute()
    {
        ErrorMessage = PasswordPolicy.ErrorMessage;
    }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not string password || string.IsNullOrEmpty(password))
        {
            return ValidationResult.Success;
        }

        var (isValid, error) = PasswordPolicy.Validate(password);
        return isValid ? ValidationResult.Success : new ValidationResult(error ?? PasswordPolicy.ErrorMessage);
    }
}

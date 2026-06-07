namespace ApiProject.Helpers;

public static class ApiErrorHelper
{
    public const string GenericServerMessage = "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.";

    public static object ServerError(IHostEnvironment environment, Exception ex, string userMessage = GenericServerMessage)
    {
        if (environment.IsDevelopment())
        {
            return new { message = userMessage, error = ex.Message };
        }

        return new { message = userMessage };
    }

    public static object BadRequest(IHostEnvironment environment, string userMessage, Exception? ex = null)
    {
        if (environment.IsDevelopment() && ex != null)
        {
            return new { message = userMessage, error = ex.Message };
        }

        return new { message = userMessage };
    }
}

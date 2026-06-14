import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  login,
  register,
  resendVerificationEmail,
  ApiError,
  AppRole,
  RegisterRole,
} from "../services/authService";
import { PASSWORD_POLICY_MESSAGE, validatePassword } from "../utils/passwordPolicy";

const isDigitEmail = (email: string): boolean => {
  const localPart = email.split("@")[0]?.trim() ?? "";
  return localPart.length > 0 && /^\d/.test(localPart);
};

const isLetterEmail = (email: string): boolean => {
  const localPart = email.split("@")[0]?.trim() ?? "";
  return localPart.length > 0 && /^[a-zA-Z]/.test(localPart);
};

const getAllowedRegisterRoles = (email: string): RegisterRole[] => {
  if (isDigitEmail(email)) return ["student"];
  if (isLetterEmail(email)) return ["instructor", "personnel"];
  return ["student", "instructor", "personnel"];
};

const redirectByRole = (navigate: ReturnType<typeof useNavigate>, role: AppRole) => {
  if (role === "student" || role === "personnel") {
    navigate("/ogrenci", { replace: true });
  } else if (role === "instructor") {
    navigate("/ogretim-elemani", { replace: true });
  } else if (role === "cashier") {
    navigate("/kasiyer/siparisler", { replace: true });
  } else if (role === "superadmin") {
    navigate("/admin", { replace: true });
  } else if (role === "subadmin") {
    navigate("/admin/panel", { replace: true });
  } else {
    navigate("/", { replace: true });
  }
};

const ROLE_OPTIONS: { value: RegisterRole; label: string }[] = [
  { value: "student", label: "Öğrenci" },
  { value: "instructor", label: "Öğretim Elemanı" },
  { value: "personnel", label: "İdari Personel" },
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showError, setShowError] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSignup, setIsSignup] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("kayit") === "1";
  });

  // Doğrulama maili tekrar gönderme
  const [resendEmail, setResendEmail] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendInfo, setResendInfo] = useState<string>("");

  const allowedRegisterRoles = useMemo(() => getAllowedRegisterRoles(email.trim()), [email]);

  const resetSignupFields = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRegisterRole("student");
  };

  useEffect(() => {
    if (!isSignup) return;
    if (!allowedRegisterRoles.includes(registerRole)) {
      setRegisterRole(allowedRegisterRoles[0]);
    }
  }, [allowedRegisterRoles, registerRole, isSignup]);

  useEffect(() => {
    if (error) {
      setShowError(true);
      setShowSuccess(false);
      setSuccess("");
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      setShowError(false);
      setError("");
    }
  }, [success]);

  // Cooldown geri sayım
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!resendEmail || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendInfo("");
    try {
      const r = await resendVerificationEmail(resendEmail);
      setResendCooldown(r.cooldownSeconds || 60);
      setResendInfo("Doğrulama e-postası tekrar gönderildi. Lütfen gelen kutunu kontrol et.");
    } catch (err: any) {
      if (err?.cooldownSeconds) {
        setResendCooldown(err.cooldownSeconds);
      }
      setResendInfo(err?.message || "Tekrar gönderme başarısız.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setShowError(false);
    setShowSuccess(false);
    setLoading(true);

    try {
      const response = await login({ username, password });
      redirectByRole(navigate, response.user.role);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Giriş yapılırken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setShowError(false);
    setShowSuccess(false);
    setLoading(true);

    try {
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedEmail = email.trim();

      if (!trimmedFirstName || !trimmedLastName) {
        setError("Ad ve soyad zorunludur.");
        return;
      }

      if (!trimmedEmail.includes("@")) {
        setError("Geçerli bir e-posta adresi girin.");
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (!allowedRegisterRoles.includes(registerRole)) {
        setError("Seçtiğiniz hesap türü bu e-posta adresi için uygun değil.");
        return;
      }

      const response = await register({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        password,
        role: registerRole,
      });

      if (!response.token) {
        setSuccess(
          "Kayıt başarılı! 🎉\n\nE-posta adresinize bir doğrulama linki gönderdik. Lütfen e-postanızı kontrol edin ve doğrulama linkine tıklayın.\n\nE-postayı bulamıyorsanız spam klasörünü kontrol etmeyi unutmayın.",
        );
        setIsSignup(false);
        setUsername(trimmedEmail);
        setResendEmail(trimmedEmail);
        setResendCooldown(60); // İlk kayıt sonrası 60 sn bekle
        setResendInfo("");
        resetSignupFields();
        setPassword("");
        return;
      }

      redirectByRole(navigate, response.user.role);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Kayıt yapılırken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={isSignup ? handleRegister : handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-xl shadow flex flex-col gap-4"
      >
        <h1 className="text-xl font-semibold text-center text-slate-800">
          {isSignup ? "Başkent Yaşam Kayıt" : "Başkent Yaşam Giriş"}
        </h1>

        {success && showSuccess && (
          <div
            className="bg-green-50 border-l-4 border-green-500 text-green-800 px-5 py-4 rounded-lg shadow-lg relative transition-all duration-300 ease-out"
            style={{ animation: "slideDown 0.3s ease-out", minHeight: "80px" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl flex-shrink-0 mt-1">✅</span>
                <div className="flex-1">
                  <p className="font-bold text-base mb-2 text-green-900">Başarılı!</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-green-700">{success}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  setTimeout(() => setSuccess(""), 300);
                }}
                className="text-green-400 hover:text-green-700 hover:bg-green-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                aria-label="Kapat"
                title="Kapat"
              >
                <span className="text-xl font-bold leading-none">×</span>
              </button>
            </div>

            {resendEmail && (
              <div className="mt-3 border-t border-green-200 pt-3">
                <p className="text-xs text-green-800 mb-2">
                  Mail gelmediyse tekrar gönderebilirsin (<b>{resendEmail}</b>):
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || resendLoading}
                  className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition-colors"
                >
                  {resendLoading
                    ? "Gönderiliyor..."
                    : resendCooldown > 0
                      ? `Tekrar Gönder (${resendCooldown}s)`
                      : "📧 Tekrar Gönder"}
                </button>
                {resendInfo && (
                  <p className="text-xs text-green-700 mt-2">{resendInfo}</p>
                )}
              </div>
            )}
          </div>
        )}

        {error && showError && (
          <div
            className="bg-red-50 border-l-4 border-red-500 text-red-800 px-5 py-4 rounded-lg shadow-lg relative transition-all duration-300 ease-out"
            style={{ animation: "slideDown 0.3s ease-out", minHeight: "80px" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl flex-shrink-0 mt-1">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold text-base mb-2 text-red-900">Dikkat!</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-red-700">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowError(false);
                  setTimeout(() => setError(""), 300);
                }}
                className="text-red-400 hover:text-red-700 hover:bg-red-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                aria-label="Kapat"
                title="Kapat"
              >
                <span className="text-xl font-bold leading-none">×</span>
              </button>
            </div>
          </div>
        )}

        {isSignup ? (
          <>
            <input
              type="text"
              placeholder="Ad"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="text"
              placeholder="Soyad"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-lg px-4 py-2"
              required
            />

            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium text-slate-700">Hesap Türü</legend>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((option) => {
                  const enabled = allowedRegisterRoles.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                        enabled
                          ? registerRole === option.value
                            ? "border-[#d71920] bg-red-50"
                            : "border-slate-200 cursor-pointer"
                          : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="radio"
                        name="registerRole"
                        value={option.value}
                        checked={registerRole === option.value}
                        disabled={!enabled}
                        onChange={() => setRegisterRole(option.value)}
                        className="mt-1"
                      />
                      <span className="text-sm font-medium text-slate-900">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        ) : (
          <input
            type="text"
            placeholder="Kullanıcı adı veya e-posta"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded-lg px-4 py-2"
            required
          />
        )}

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-4 py-2"
          minLength={isSignup ? 8 : undefined}
          maxLength={isSignup ? 15 : undefined}
          required
        />
        {isSignup && (
          <p className="text-xs text-slate-500 -mt-2">{PASSWORD_POLICY_MESSAGE}</p>
        )}

        {!isSignup && (
          <div className="text-right mt-2">
            <Link to="/sifremi-unuttum" className="text-sm text-blue-600 hover:underline">
              Şifremi Unuttum
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#d71920] text-white py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? isSignup
              ? "Kayıt yapılıyor..."
              : "Giriş yapılıyor..."
            : isSignup
              ? "Kayıt ol"
              : "Giriş yap"}
        </button>

        <p className="text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              Hesabınız var mı?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(false);
                  resetSignupFields();
                  setError("");
                  setSuccess("");
                  setShowError(false);
                  setShowSuccess(false);
                }}
                className="underline text-[#d71920]"
              >
                Giriş yap
              </button>
            </>
          ) : (
            <>
              Hesabınız yok mu?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(true);
                  setError("");
                  setSuccess("");
                  setShowError(false);
                  setShowSuccess(false);
                }}
                className="underline text-[#d71920]"
              >
                Kayıt ol
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default LoginPage;

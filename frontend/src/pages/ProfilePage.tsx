import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
  logout,
  MyProfile,
} from "../services/authService";
import { PASSWORD_POLICY_MESSAGE, validatePassword } from "../utils/passwordPolicy";

const getInitials = (name?: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isInstructorRole = (role?: string) => {
  const r = (role || "").toLowerCase();
  return r === "teacher" || r === "instructor";
};

const isStudentRole = (role?: string) => (role || "").toLowerCase() === "student";

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  // ÖNEMLİ: getCurrentUser her render'da yeni nesne döner; useEffect'in sonsuz
  // döngüye girmemesi için sadece bir kez okuyup state'te tutuyoruz.
  const [localUser] = useState(() => getCurrentUser());

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Form state
  const [department, setDepartment] = useState("");
  const [faculty, setFaculty] = useState("");
  const [fullName, setFullName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [courses, setCourses] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Şifre değiştirme
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const role = profile?.role || localUser?.role;
  const isInstructor = isInstructorRole(role);
  const isStudent = isStudentRole(role);

  const dashboardPath = useMemo(() => {
    const r = (localUser?.role || "").toLowerCase();
    if (r === "student") return "/ogrenci";
    if (r === "cashier" || r === "staff") return "/kasiyer";
    return "/ogretim-elemani";
  }, [localUser?.role]);

  const syncFormFromProfile = useCallback((p: MyProfile) => {
    setFullName(p.name || "");
    setFaculty(p.faculty || "");
    setDepartment(p.department || "");
    setRoomNumber(p.roomNumber || "");
    setPhoneNumber(p.phoneNumber || "");
    setClassLevel(p.classLevel || "");
    setStudentNo(p.studentNo || "");
    setCourses(p.courses || "");
    setProfileImage(p.profileImage || null);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      syncFormFromProfile(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Profil bilgileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [syncFormFromProfile]);

  useEffect(() => {
    if (!localUser) {
      navigate("/");
      return;
    }
    fetchProfile();
  }, [fetchProfile, localUser, navigate]);

  const handlePickPhoto = () => fileInputRef.current?.click();

  // Sadece profil fotoğrafını anında günceller (diğer alanlar dokunulmaz)
  const persistPhotoOnly = useCallback(
    async (newPhoto: string | null) => {
      setProfileError(null);
      setProfileSuccess(null);
      setSavingProfile(true);
      try {
        const updated = await updateMyProfile({
          profileImage: newPhoto ?? "",
        });
        setProfile(updated);
        setProfileImage(updated.profileImage || null);

        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const u = JSON.parse(userStr);
            u.profileImage = updated.profileImage || null;
            localStorage.setItem("user", JSON.stringify(u));
          }
        } catch {
          /* yoksay */
        }

        setProfileSuccess(
          newPhoto
            ? "Profil fotoğrafınız güncellendi."
            : "Profil fotoğrafınız kaldırıldı.",
        );
      } catch (err: any) {
        setProfileError(err.message || "Profil fotoğrafı kaydedilemedi.");
        // Hata olduysa ekranda eski fotoğrafa dön
        if (profile) setProfileImage(profile.profileImage || null);
      } finally {
        setSavingProfile(false);
      }
    },
    [profile],
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Lütfen bir resim dosyası seçin.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setProfileError("Resim 2 MB'tan büyük olamaz.");
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileImage(dataUrl);
      await persistPhotoOnly(dataUrl);
    } catch (err: any) {
      setProfileError(err.message || "Resim yüklenemedi.");
    } finally {
      e.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setProfileImage(null);
    await persistPhotoOnly(null);
  };

  const handleResetForm = () => {
    if (profile) syncFormFromProfile(profile);
    setProfileError(null);
    setProfileSuccess(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        name: fullName.trim(),
        faculty: faculty.trim(),
        department: department.trim(),
        roomNumber: isInstructor ? roomNumber.trim() : "",
        phoneNumber: phoneNumber.trim(),
        classLevel: isStudent ? classLevel.trim() : "",
        studentNo: isStudent ? studentNo.trim() : "",
        courses: isInstructor ? courses.trim() : "",
      });
      setProfile(updated);
      syncFormFromProfile(updated);
      setProfileSuccess("Profil bilgileriniz güncellendi.");
    } catch (err: any) {
      setProfileError(err.message || "Profil güncellenirken bir hata oluştu.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Tüm alanları doldurun.");
      return;
    }
    const policyError = validatePassword(newPassword);
    if (policyError) {
      setPasswordError(policyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Yeni şifre ile tekrar şifre eşleşmiyor.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("Yeni şifre mevcut şifreden farklı olmalıdır.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(
        "Şifreniz başarıyla güncellendi. Güvenlik için oturumunuz kapatılıyor, lütfen yeni şifrenizle tekrar giriş yapın.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);

      setTimeout(() => {
        logout();
        navigate("/");
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.message || "Şifre değiştirilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (r?: string) => {
    switch ((r || "").toLowerCase()) {
      case "student":
        return "Öğrenci";
      case "teacher":
      case "instructor":
        return "Öğretim Elemanı";
      case "staff":
      case "admin":
      case "cashier":
        return "Personel";
      default:
        return r || "-";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  const initials = getInitials(profile?.name);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-semibold">Profilim</h1>
          <Link to={dashboardPath} className="text-sm underline hover:opacity-90">
            Anasayfaya dön
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {profileSuccess && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
              {profileSuccess}
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
              {passwordSuccess}
            </div>
          )}

          {/* PROFİL ÖZETİ + FOTOĞRAF */}
          <section className="bg-white rounded-3xl shadow-md border border-slate-200 p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative shrink-0">
                <div className="h-32 w-32 rounded-full overflow-hidden ring-4 ring-white shadow-md bg-gradient-to-br from-[#d71920] to-[#8a1014] flex items-center justify-center text-white text-4xl font-bold">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profil fotoğrafı"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePickPhoto}
                  className="absolute bottom-0 right-0 rounded-full bg-white border border-slate-200 shadow px-3 py-1.5 text-xs font-semibold text-[#d71920] hover:bg-slate-50"
                  title="Fotoğrafı değiştir"
                >
                  Değiştir
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-slate-900">
                  {profile?.name || "-"}
                </h2>
                <p className="text-slate-600 text-sm break-all">
                  {profile?.email || "-"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#d71920] border border-red-100">
                    {roleLabel(profile?.role)}
                  </span>
                  {isStudent && profile?.studentNo && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      No: {profile.studentNo}
                    </span>
                  )}
                </div>

                {profileImage && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="mt-3 text-xs text-slate-500 underline hover:text-red-600"
                  >
                    Fotoğrafı kaldır
                  </button>
                )}
              </div>
            </div>

            {profileError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                {profileError}
              </div>
            )}
          </section>

          {/* KİŞİSEL BİLGİLER */}
          <section className="bg-white rounded-3xl shadow-md border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Kişisel Bilgiler
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <InfoBox label="E-posta" value={profile?.email} breakAll />
              <InfoBox label="Rol" value={roleLabel(profile?.role)} />
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Ad Soyad"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Adınız ve soyadınız"
                />
                {isStudent && (
                  <Field
                    label="Öğrenci Numarası"
                    value={studentNo}
                    onChange={setStudentNo}
                    placeholder="Örn: 22192103"
                  />
                )}
                {(isStudent || isInstructor) && (
                  <Field
                    label="Fakülte"
                    value={faculty}
                    onChange={setFaculty}
                    placeholder="Örn: Mühendislik Fakültesi"
                  />
                )}
                <Field
                  label={isStudent ? "Bölüm" : "Bölüm / Birim"}
                  value={department}
                  onChange={setDepartment}
                  placeholder="Örn: Bilgisayar Mühendisliği"
                />
                <Field
                  label="Telefon"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="Örn: 0 532 000 00 00"
                />
                {isInstructor && (
                  <Field
                    label="Oda No"
                    value={roomNumber}
                    onChange={setRoomNumber}
                    placeholder="Örn: B-203"
                  />
                )}
                {isStudent && (
                  <Field
                    label="Sınıf"
                    value={classLevel}
                    onChange={setClassLevel}
                    placeholder="Örn: 3"
                  />
                )}
              </div>

              {isInstructor && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Verdiğim Dersler
                  </label>
                  <textarea
                    value={courses}
                    onChange={(e) => setCourses(e.target.value)}
                    placeholder="Örn: Veri Yapıları, Algoritma, Java"
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Ders adlarını virgülle ayırarak yazın. Öğrenciler randevu
                    talebi alırken bu listeden seçim yapar.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 rounded-xl bg-[#d71920] py-3 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? "Kaydediliyor..." : "Bilgileri Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  disabled={savingProfile}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Geri Al
                </button>
              </div>
            </form>
          </section>

          {/* ERİŞİM BİLGİLERİ */}
          <section className="bg-white rounded-3xl shadow-md border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Erişim Bilgileri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InfoBox
                label="İlk Erişim"
                value={formatDateTime(profile?.firstLoginAt)}
              />
              <InfoBox
                label="Son Erişim"
                value={formatDateTime(profile?.lastLoginAt)}
              />
            </div>
          </section>

          {/* GÜVENLİK */}
          <section className="bg-white rounded-3xl shadow-md border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Güvenlik</h2>
              {!showPasswordForm && (
                <button
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPasswordSuccess(null);
                    setPasswordError(null);
                  }}
                  className="rounded-xl bg-[#d71920] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Şifremi Değiştir
                </button>
              )}
            </div>

            {!showPasswordForm ? (
              <p className="text-slate-600 text-sm">
                Hesabınızın güvenliği için şifrenizi düzenli olarak
                değiştirmeniz önerilir.
              </p>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mevcut Şifre
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Yeni Şifre
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={15}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {PASSWORD_POLICY_MESSAGE}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Yeni Şifre (Tekrar)
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={15}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-[#d71920] py-3 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError(null);
                    }}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

interface InfoBoxProps {
  label: string;
  value?: string | null;
  breakAll?: boolean;
}

const InfoBox: React.FC<InfoBoxProps> = ({ label, value, breakAll }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">
      {label}
    </p>
    <p
      className={`text-lg font-semibold text-slate-900 ${
        breakAll ? "break-all" : ""
      }`}
    >
      {value && value.toString().trim() !== "" ? value : "—"}
    </p>
  </div>
);

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const Field: React.FC<FieldProps> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
    />
  </div>
);

export default ProfilePage;

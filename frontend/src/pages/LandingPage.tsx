import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAuthenticated, getCurrentUser } from "../services/authService";

const RED = "#d71920";

const features = [
  {
    title: "Kütüphane",
    desc: "Çalışma yerine gitmeden önce kütüphanenin anlık doluluğunu gör, geçmiş yoğunluk grafiklerini incele.",
    img: "/kütüphane.png",
  },
  {
    title: "Otopark",
    desc: "Kampüsteki otoparkların boş kapasitesini canlı takip et; aracını park etmeden uygun alana yönel.",
    img: "/otopark.png",
  },
  {
    title: "Kafeterya",
    desc: "Menüyü incele, siparişini önceden ver; ödeme akışı kasiyer paneliyle hızlı ve raporlanabilir.",
    img: "/kafeterya.png",
  },
  {
    title: "Doluluk Takibi",
    desc: "Kampüs içine konuşlandırılmış kameralar görüntü işleme ile giriş-çıkışları otomatik sayar.",
    img: "/randevu.png",
  },
];

const steps = [
  {
    n: "1",
    title: "Kayıt Ol",
    desc: "Üniversite e-posta adresinle hesabını oluştur, rolünü seç (öğrenci, akademisyen, personel).",
  },
  {
    n: "2",
    title: "E-postanı Doğrula",
    desc: "Gelen kutuna gönderilen bağlantıya tıkla, hesabını aktifleştir.",
  },
  {
    n: "3",
    title: "Kullanmaya Başla",
    desc: "Kampüsteki tüm hizmetlere tek bir hesapla, tek bir platformdan eriş.",
  },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Oturum açıksa landing'i atla, rolüne uygun ekrana git
    if (!isAuthenticated()) return;
    const user = getCurrentUser();
    const role = user?.role as string | undefined;
    if (role === "superadmin" || role === "subadmin") navigate("/admin/panel", { replace: true });
    else if (role === "instructor") navigate("/ogretim-elemani", { replace: true });
    else if (role === "cashier") navigate("/kasiyer/siparisler", { replace: true });
    else navigate("/ogrenci", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* NAV */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo192.png" alt="Başkent Yaşam" className="w-9 h-9 rounded" />
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">Başkent Yaşam</div>
              <div className="text-[11px] text-slate-500 -mt-0.5">Kampüs Platformu</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/giris"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Giriş Yap
            </Link>
            <Link
              to="/giris?kayit=1"
              className="px-3 sm:px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: RED }}
            >
              Kayıt Ol
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #d71920 0, transparent 40%), radial-gradient(circle at 80% 60%, #d71920 0, transparent 40%)",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-medium mb-6"
            style={{ color: RED }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RED }} />
            Başkent Üniversitesi Bitirme Projesi
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
            Kampüsteki tüm hizmetler
            <br />
            <span style={{ color: RED }}>tek platformda</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Kütüphane doluluğundan otopark boş alanına, kafeterya menüsünden anlık bildirimlere
            kadar günlük kampüs ihtiyaçlarını tek bir hesapla yönet.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/giris?kayit=1"
              className="px-6 py-3 rounded-lg text-white font-semibold shadow-sm hover:opacity-95"
              style={{ backgroundColor: RED }}
            >
              Hemen Kayıt Ol
            </Link>
            <Link
              to="/giris"
              className="px-6 py-3 rounded-lg font-semibold border border-slate-300 hover:bg-slate-50"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Neler Sunuyor?</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Kampüs hizmetlerini dijitalleştirerek günlük rutinini hızlandıran modüller.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-red-200 transition"
              >
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center mb-4 overflow-hidden">
                  <img src={f.img} alt={f.title} className="w-10 h-10 object-contain" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Nasıl Çalışır?</h2>
            <p className="mt-3 text-slate-600">Üç adımda kullanmaya başla.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="text-center px-2">
                <div
                  className="w-14 h-14 mx-auto rounded-full text-white text-xl font-bold flex items-center justify-center mb-4"
                  style={{ backgroundColor: RED }}
                >
                  {s.n}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/giris?kayit=1"
              className="inline-block px-6 py-3 rounded-lg text-white font-semibold shadow-sm hover:opacity-95"
              style={{ backgroundColor: RED }}
            >
              Hesap Oluştur
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <img src="/logo192.png" alt="" className="w-6 h-6 rounded" />
            <span>© {new Date().getFullYear()} Başkent Yaşam</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/giris" className="hover:text-slate-900">
              Giriş
            </Link>
            <Link to="/giris?kayit=1" className="hover:text-slate-900">
              Kayıt
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../services/authService";
import NotificationBell from "../components/NotificationBell";
import ProfileButton from "../components/ProfileButton";

const tileClass =
  "bg-white rounded-2xl border border-slate-200 p-5 shadow hover:shadow-lg transition flex flex-col items-center text-center min-h-[200px] max-h-[280px] overflow-hidden w-full";

const TileImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <div className="w-full flex-1 min-h-0 flex items-center justify-center mb-3 max-h-[7.5rem]">
    <img
      src={src}
      alt={alt}
      className="max-h-full max-w-full w-auto h-auto object-contain"
      loading="lazy"
      decoding="async"
    />
  </div>
);

const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const openLogoutModal = () => setShowLogoutModal(true);
  const closeLogoutModal = () => setShowLogoutModal(false);

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-semibold">
            Başkent Yaşam – Öğretim Elemanı
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Hoş Geldiniz, {user?.name || "Öğretim Elemanı"}
            </span>
            <NotificationBell />
            <ProfileButton />
            <button
              onClick={openLogoutModal}
              className="hover:underline text-sm"
            >
              Çıkış yap
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 auto-rows-fr">
          <button
            type="button"
            onClick={() => navigate("/randevu-yonetimi")}
            className={tileClass}
          >
            <TileImage src="/randevu.png" alt="Randevu" />
            <h3 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2 break-words w-full shrink-0">
              Randevu Yönetimi
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/kutuphane")}
            className={tileClass}
          >
            <TileImage src="/kütüphane.png" alt="Kütüphane" />
            <h3 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2 break-words w-full shrink-0">
              Kütüphane Doluluk
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/kafeterya")}
            className={tileClass}
          >
            <TileImage src="/kafeterya.png" alt="Kafeterya" />
            <h3 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2 break-words w-full shrink-0">
              Kafeterya Sipariş
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/otopark")}
            className={tileClass}
          >
            <TileImage src="/otopark.png" alt="Otopark" />
            <h3 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2 break-words w-full shrink-0">
              Otopark Doluluk
            </h3>
          </button>
        </div>
      </main>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeLogoutModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-title" className="text-lg font-semibold mb-4">
              Çıkış Yap
            </h2>
            <p className="text-slate-600 mb-6">
              Çıkış yapmak istediğinizden emin misiniz?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeLogoutModal}
                className="px-4 py-2 rounded-md border"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  handleLogout();
                }}
                className="px-4 py-2 rounded-md bg-[#d71920] text-white"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;

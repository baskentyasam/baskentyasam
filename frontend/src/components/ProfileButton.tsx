import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getMyProfile } from "../services/authService";

interface ProfileButtonProps {
  className?: string;
}

const getInitials = (name?: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const ProfileButton: React.FC<ProfileButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  // getCurrentUser her çağrıda yeni obje döndürdüğü için state'te sabitliyoruz
  const [user] = useState(() => getCurrentUser());
  const initials = getInitials(user?.name);

  const [photo, setPhoto] = useState<string | null>(
    (user && user.profileImage) || null,
  );

  // localStorage'da fotoğraf yoksa backend'den çek (oturum başında bir kez)
  useEffect(() => {
    let cancelled = false;
    if (!photo && user) {
      getMyProfile()
        .then((p) => {
          if (cancelled) return;
          if (p.profileImage) {
            setPhoto(p.profileImage);
            try {
              const userStr = localStorage.getItem("user");
              if (userStr) {
                const u = JSON.parse(userStr);
                u.profileImage = p.profileImage;
                localStorage.setItem("user", JSON.stringify(u));
              }
            } catch {
              /* yoksay */
            }
          }
        })
        .catch(() => {
          /* sessiz */
        });
    }
    return () => {
      cancelled = true;
    };
    // sadece bir kez çalışsın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={() => navigate("/profil")}
      className={`group flex items-center gap-2 rounded-full bg-white pl-1 pr-3 py-1 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${className}`}
      aria-label="Profilim"
      title="Profilim"
    >
      <span className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-[#d71920] to-[#8a1014] text-white font-bold text-sm shadow-inner ring-2 ring-white overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt="Profil"
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </span>
      <span className="text-sm font-semibold text-[#d71920] group-hover:text-[#8a1014]">
        Profilim
      </span>
    </button>
  );
};

export default ProfileButton;

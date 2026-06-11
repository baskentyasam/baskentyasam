import React from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, getRoleDisplayName, logout } from "../services/authService";

interface Props {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}

type NavItem = {
  to?: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

const AdminLayout: React.FC<Props> = ({ title, children, subtitle }) => {
  const user = getCurrentUser();
  const location = useLocation();
  const isSuperAdmin = user?.role === "superadmin";

  const superAdminLinks: NavItem[] = [
    { to: "/admin", label: "Dashboard", icon: "🏠" },
    { to: "/admin/sub-admins", label: "Alt Admin Yönetimi", icon: "👥" },
    { to: "/admin/users", label: "Kullanıcı Yönetimi", icon: "👤" },
    { to: "/admin/cafeterias", label: "Kafeterya", icon: "🍽️" },
    { to: "/admin/library", label: "Kütüphane", icon: "📚" },
    { to: "/admin/parking", label: "Otopark", icon: "🅿️" },
    { to: "/admin/appointments", label: "Randevu", icon: "📅" },
    { to: "/admin/cameras", label: "Kameralar", icon: "📹" },
  ];

  const subAdminLinks: NavItem[] = [{ to: "/admin/panel", label: "Panelim", icon: "📋" }];

  const links = isSuperAdmin ? superAdminLinks : subAdminLinks;

  const isActive = (to: string) => {
    if (to === "/admin") return location.pathname === "/admin";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex bg-[#f4f7f9]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col bg-[#1a1c2e] text-white">
        <div className="px-6 pt-7 pb-5">
          <div className="text-sm font-bold tracking-[0.12em]">
            {isSuperAdmin ? "ADMIN" : "ALT ADMIN"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {isSuperAdmin ? "Admin Sistem Yöneticisi" : getRoleDisplayName(user?.role)}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {links.map((item) => {
            if (item.disabled || !item.to) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            }

            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                  active
                    ? "bg-[#d92128] text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="text-base">🚪</span>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <div className="ml-[260px] flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <span className="text-sm text-slate-400">Başkent Yaşam Yönetim Paneli</span>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">
          {subtitle && <p className="mb-6 text-sm text-slate-500">{subtitle}</p>}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

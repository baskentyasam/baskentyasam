import React from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";

const modules = [
  {
    to: "/admin/sub-admins",
    icon: "👥",
    title: "Alt Admin Yönetimi",
    description: "Modül bazlı alt yönetici atama ve yönetimi",
    available: true,
  },
  {
    to: "/admin/cafeterias",
    icon: "🍽️",
    title: "Kafeterya Yönetimi",
    description: "Menü, sipariş, ödeme ve borç yönetimi",
    available: true,
  },
  {
    to: "/admin/parking",
    icon: "🅿️",
    title: "Otopark Yönetimi",
    description: "Doluluk ve kapasite takibi",
    available: true,
  },
  {
    to: "/admin/users",
    icon: "👤",
    title: "Kullanıcı Yönetimi",
    description: "Öğrenci, öğretim elemanı ve personel yönetimi",
    available: true,
  },
  {
    to: "/admin/library",
    icon: "📚",
    title: "Kütüphane Yönetimi",
    description: "Doluluk ve kapasite yönetimi",
    available: true,
  },
  {
    to: "/admin/appointments",
    icon: "📅",
    title: "Randevu Yönetimi",
    description: "Öğretim elemanı uygunlukları ve randevu kayıtları",
    available: true,
  },
];

const AdminDashboardPage: React.FC = () => {
  return (
    <AdminLayout
      title="Yönetim Paneli"
      subtitle="Tüm modülleri buradan yönetebilir, alt yöneticileri atayabilirsiniz."
    >
      <div className="admin-grid-3">
        {modules.map((module) =>
          module.available && module.to ? (
            <Link
              key={module.title}
              to={module.to}
              className="admin-card admin-card-body transition-shadow hover:shadow-md"
            >
              <div className="mb-4 text-3xl">{module.icon}</div>
              <h2 className="mb-2 text-base font-semibold text-slate-900">{module.title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{module.description}</p>
            </Link>
          ) : (
            <div key={module.title} className="admin-card admin-card-body opacity-70">
              <div className="mb-4 text-3xl">{module.icon}</div>
              <h2 className="mb-2 text-base font-semibold text-slate-900">{module.title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{module.description}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">Yakında</p>
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;

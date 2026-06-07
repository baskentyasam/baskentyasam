import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { getMyAdminAssignment } from "../services/adminService";

const SubAdminPanelPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyAdminAssignment()
      .then((d) => {
        setData(d);
        const assignment = d?.assignment;
        if (!assignment) return;

        if (assignment.moduleType === "Cafeteria") {
          window.location.href = `/admin/cafeteria/${assignment.scopeKey}`;
        } else if (assignment.moduleType === "Parking") {
          window.location.href = `/admin/parking/${assignment.scopeKey}`;
        } else if (assignment.moduleType === "Library") {
          window.location.href = "/admin/library";
        } else if (assignment.moduleType === "Appointment") {
          window.location.href = "/admin/appointments";
        }
      })
      .catch(() => setError("Atama bilgisi yüklenemedi."));
  }, []);

  return (
    <AdminLayout title="Alt Admin Paneli">
      <div className="admin-card admin-card-body max-w-2xl">
        {error && <div className="text-red-600">{error}</div>}
        {!error && !data && <div className="text-slate-500">Yükleniyor...</div>}
        {data?.assignment && (
          <div>
            <p className="mb-4 text-slate-700">
              Atamanız: <strong>{data.assignment.moduleType}</strong> -{" "}
              {data.assignment.scopeDisplayName}
            </p>
            {data.assignment.moduleType === "Cafeteria" && (
              <Link className="admin-btn-outline-blue" to={`/admin/cafeteria/${data.assignment.scopeKey}`}>
                Kafeterya paneline git
              </Link>
            )}
            {data.assignment.moduleType === "Parking" && (
              <Link className="admin-btn-outline-blue" to={`/admin/parking/${data.assignment.scopeKey}`}>
                Otopark paneline git
              </Link>
            )}
            {data.assignment.moduleType === "Library" && (
              <Link className="admin-btn-outline-blue" to="/admin/library">
                Kütüphane paneline git
              </Link>
            )}
            {data.assignment.moduleType === "Appointment" && (
              <Link className="admin-btn-outline-blue" to="/admin/appointments">
                Randevu paneline git
              </Link>
            )}
          </div>
        )}
        {!data?.assignment && !error && <div className="admin-empty">Aktif bir atama bulunamadı.</div>}
      </div>
    </AdminLayout>
  );
};

export default SubAdminPanelPage;

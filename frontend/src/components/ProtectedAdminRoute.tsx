import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { getMyAdminAssignment } from "../services/adminService";

interface Props {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  scopedModule?: "cafeteria" | "parking";
}

const ProtectedAdminRoute: React.FC<Props> = ({
  children,
  requireSuperAdmin = false,
  scopedModule,
}) => {
  const user = getCurrentUser();
  const params = useParams();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || (user.role !== "superadmin" && user.role !== "subadmin")) {
      setAllowed(false);
      return;
    }

    if (requireSuperAdmin && user.role !== "superadmin") {
      setAllowed(false);
      return;
    }

    if (scopedModule && user.role === "subadmin") {
      getMyAdminAssignment()
        .then((data) => {
          const assignment = data?.assignment;
          if (!assignment) {
            setAllowed(false);
            return;
          }
          if (
            scopedModule === "cafeteria" &&
            assignment.moduleType === "Cafeteria" &&
            assignment.scopeKey === params.cafeteriaId
          ) {
            setAllowed(true);
            return;
          }
          if (
            scopedModule === "parking" &&
            assignment.moduleType === "Parking" &&
            assignment.scopeKey === params.parkingLotId
          ) {
            setAllowed(true);
            return;
          }
          setAllowed(false);
        })
        .catch(() => setAllowed(false));
      return;
    }

    setAllowed(true);
  }, [user, requireSuperAdmin, scopedModule, params.cafeteriaId, params.parkingLotId]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Yükleniyor...
      </div>
    );
  }

  if (!user || (user.role !== "superadmin" && user.role !== "subadmin")) {
    return <Navigate to="/" replace />;
  }

  if (!allowed) {
    return <Navigate to="/admin/panel" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;

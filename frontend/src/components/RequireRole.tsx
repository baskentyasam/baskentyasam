import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";

type AppRole = "student" | "instructor" | "cashier" | "superadmin" | "subadmin";

interface Props {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

const RequireRole: React.FC<Props> = ({ children, allowedRoles }) => {
  const user = getCurrentUser();
  if (!user?.role || !allowedRoles.includes(user.role as AppRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default RequireRole;

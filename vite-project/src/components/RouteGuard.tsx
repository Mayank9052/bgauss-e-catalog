import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import {
  clearToken,
  getDefaultPathForRole,
  getRoleFromToken,
  getToken,
  type AppRole
} from "../auth";

interface ProtectedRouteProps {
  children: ReactElement;
  allowedRoles: AppRole[];
}

export const ProtectedRoute = ({
  children,
  allowedRoles
}: ProtectedRouteProps) => {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = getRoleFromToken();

  if (!role) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  return children;
};

interface PublicOnlyRouteProps {
  children: ReactElement;
}

export const PublicOnlyRoute = ({ children }: PublicOnlyRouteProps) => {
  const role = getRoleFromToken();

  if (role) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  return children;
};

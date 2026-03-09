import { jwtDecode } from "jwt-decode";

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export type AppRole = "Admin" | "User";

type JwtClaims = Record<string, unknown> & {
  role?: unknown;
};

export const getToken = (): string | null => localStorage.getItem("token");

export const clearToken = (): void => {
  localStorage.removeItem("token");
};

const normalizeRole = (role: unknown): AppRole | null => {
  if (typeof role !== "string") {
    return null;
  }

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "admin") {
    return "Admin";
  }

  if (normalizedRole === "user") {
    return "User";
  }

  return null;
};

export const getRoleFromToken = (): AppRole | null => {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode<JwtClaims>(token);
    const role = decoded[ROLE_CLAIM] ?? decoded.role;
    return normalizeRole(role);
  } catch {
    return null;
  }
};

export const getDefaultPathForRole = (role: AppRole | null): string => {
  if (role === "Admin") {
    return "/dashboard";
  }

  if (role === "User") {
    return "/dashboard";
  }

  return "/login";
};

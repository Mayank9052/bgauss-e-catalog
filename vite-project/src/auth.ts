import { jwtDecode } from "jwt-decode";

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export type AppRole = "Admin" | "User";

export interface AuthProfile {
  username: string;
  role: AppRole | string;
  userId: string;
}

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

export const getProfileFromToken = (): AuthProfile | null => {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode<JwtClaims>(token);

    const username =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      decoded.name ??
      "User";

    const rawRole = decoded[ROLE_CLAIM] ?? decoded.role;
    const normalizedRole = normalizeRole(rawRole);

    const userId =
      decoded.UserId ??
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      "-";

    return {
      username: String(username),
      role: normalizedRole ?? String(rawRole ?? "-"),
      userId: String(userId)
    };
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

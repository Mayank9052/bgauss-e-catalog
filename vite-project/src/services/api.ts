export interface LoginResponse {
  username: string;
  token: string;
}

export async function login(
  username: string,
  password: string,
  debug = false
): Promise<LoginResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (debug) {
    headers["X-Debug-Break"] = "true";
  }

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message ?? 'Request failed');
  }

  return response.json();
}
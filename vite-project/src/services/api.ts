export interface LoginResponse {
  message: string;
  token: string;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
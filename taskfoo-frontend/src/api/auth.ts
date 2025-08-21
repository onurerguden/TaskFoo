// src/api/auth.ts
import api from "./client";

type AuthResponse = {
  token?: string;          // backend token alanı "token" ise
  accessToken?: string;    // yok "accessToken" ise
  expiresAt?: string | number;
};

const pickToken = (d: AuthResponse) => d.token ?? d.accessToken;

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  const token = res.data.token ?? res.data.accessToken;
  if (!token) throw new Error("Login response içinde token yok.");
  localStorage.setItem("token", token);
  return res.data;
}

export async function register(payload: {
  name: string; surname: string; email: string; password: string;
}) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function me() {
  const res = await api.get("/auth/me");
  return res.data as { id: number; name: string; surname: string; email: string; roles: string[] };
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}
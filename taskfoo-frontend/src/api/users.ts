import api from "./client";
import type { User } from "../types";


export type CreateUserBody = {
  name: string;
  surname?: string;
  role?: string;
};

export async function updateUserRoles(userId: number, roles: string[]) {
  // roles: ["ADMIN","PM"] vb.
  const res = await api.put(`/api/users/${userId}/roles`, { roles });
  return res.data;
}

export const createUser = async (b: CreateUserBody) =>
  (await api.post("/api/users", b)).data;



type UserBriefDto = { id: number; name: string; surname?: string; role?: string | null };

export async function listUsers(): Promise<User[]> {
  const res = await api.get<UserBriefDto[]>("/api/users");
  return (res.data ?? []).map(u => ({
    id: u.id,
    name: (u.name ?? "").trim(),
    surname: (u.surname ?? "").trim() || undefined,
    role: u.role ?? undefined,
  }));
}
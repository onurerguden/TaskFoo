import api from "./client";

export type CreateUserBody = {
  name: string;
  surname?: string;
  role?: string;
};

export const listUsers = async () => (await api.get("/api/users")).data;
export const createUser = async (b: CreateUserBody) =>
  (await api.post("/api/users", b)).data;
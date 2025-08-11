import api from "./client";
export const listUsers = async () => (await api.get("/api/users")).data;
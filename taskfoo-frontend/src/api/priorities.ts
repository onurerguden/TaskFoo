import api from "./client";
export const listPriorities = async () => (await api.get("/api/priorities")).data;
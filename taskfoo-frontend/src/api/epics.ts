import api from "./client";

export type CreateEpicBody = {
  name: string;
  description?: string;
  project: { id: number };
};

export const listEpics = async () => (await api.get("/api/epics")).data;
export const createEpic = async (b: CreateEpicBody) =>
  (await api.post("/api/epics", b)).data;
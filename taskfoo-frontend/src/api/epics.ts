// src/api/epics.ts
import api from "./client";

export type CreateEpicBody = {
  name: string;
  description?: string;
  projectId: number;      // ⬅️ top-level
  startDate?: string;     // "YYYY-MM-DD"
  dueDate?: string;       // "YYYY-MM-DD"
};

export const listEpics = async () => (await api.get("/api/epics")).data;

export async function createEpic(body: CreateEpicBody) {
  const res = await api.post("/api/epics", body);
  return res.data;
}
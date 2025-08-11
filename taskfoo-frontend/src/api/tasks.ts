import api from "./client";
import type { Task } from "../types";

export async function listTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>("/api/tasks");
  return res.data;
}

export async function updateTaskStatus(id: number, statusId: number): Promise<Task> {
  const res = await api.patch<Task>(`/api/tasks/api/tasks/${id}/status`, {}, {
    params: { statusId },
  });
  return res.data;
}
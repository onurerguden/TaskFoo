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

export async function createTask(body: {
  title: string;
  description?: string;
  status: { id: number };
  priority: { id: number };
  epic?: { id: number };
  startDate?: string;
  dueDate?: string;
}): Promise<Task> {
  const res = await api.post<Task>("/api/tasks", body);
  return res.data;
}

export async function assignUsers(taskId: number, userIds: number[]) {
  const res = await api.put<Task>(`/api/tasks/${taskId}/assign-users`, userIds);
  return res.data;
}
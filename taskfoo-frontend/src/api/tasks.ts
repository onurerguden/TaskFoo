import api from "./client";
import type { Task } from "../types";

export async function listTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>("/api/tasks");
  return res.data;
}

/**
 * Backend endpointine göre ikisinden birini AÇ:
 * A) PATCH /api/tasks/{id}/status?statusId=...
 * B) PUT /api/tasks/{id} (body'de status: {id:newStatusId})
 */

// A) Query-param ile PATCH
export async function updateTaskStatus(id: number, statusId: number): Promise<Task> {
  const res = await api.patch<Task>(`/api/tasks/${id}/status`, null, {
    params: { statusId }
  });
  return res.data;
}

// B) PUT ile tüm task (gerekirse kullan)
// export async function updateTask(id: number, body: Partial<Task>): Promise<Task> {
//   const res = await api.put<Task>(`/api/tasks/${id}`, body);
//   return res.data;
// }
import api from "./client";

/** ---------------- DTO TYPES (Backend sözleşmesi) ---------------- */
export type IdName = { id: number; name: string };

export type PriorityBrief = {
  id: number;
  name: string;
  color?: string | null;
};

export type UserBrief = {
  id: number;
  fullName: string;
};

/** /api/tasks -> liste satırı DTO */
export type TaskListItemResponse = {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  dueDate: string;
  status: IdName | null;
  priority: PriorityBrief | null;
  epic: IdName | null;
  assignees: UserBrief[];
  version: number;
};

/** POST /api/tasks body DTO */
export type CreateTaskRequest = {
  title: string;
  description?: string;
  statusId: number;
  priorityId: number;
  epicId?: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  assigneeIds?: number[];
};

/** ---------------- API CALLS (her zaman DTO döndürür) ---------------- */
export async function listTasks(): Promise<TaskListItemResponse[]> {
  const res = await api.get<TaskListItemResponse[]>("/api/tasks");
  return res.data;
}

export type UpdateTaskDatesRequest = {
  startDate: string; // "YYYY-MM-DD"
  dueDate: string;   // "YYYY-MM-DD"
  version: number;
};

export async function updateTaskDates(id: number, body: UpdateTaskDatesRequest) {
  const res = await api.patch(`/api/tasks/${id}/dates`, body);
  return res.data as TaskListItemResponse;
}
export async function updateTaskStatus(
  id: number,
  statusId: number,
  version: number
): Promise<TaskListItemResponse> {
  const res = await api.patch<TaskListItemResponse>(
    `/api/tasks/${id}/status`,
    { statusId, version } // body JSON
  );
  return res.data;
}

export async function createTask(body: CreateTaskRequest): Promise<TaskListItemResponse> {
  const res = await api.post<TaskListItemResponse>("/api/tasks", body);
  return res.data;
}

export async function assignUsers(
  taskId: number,
  userIds: number[],
  version: number
): Promise<TaskListItemResponse> {
  const res = await api.put<TaskListItemResponse>(
    `/api/tasks/${taskId}/assign-users`,
    { userIds, version } // body JSON
  );
  return res.data;
}

// --- ADD: fetch a single task by id ---
export async function getTask(id: number): Promise<TaskListItemResponse> {
  const res = await api.get<TaskListItemResponse>(`/api/tasks/${id}`);
  return res.data;
}

// Body for full PUT (based on your Swagger screenshot)
export type PutTaskBody = {
  id: number;
  version: number;
  title: string;
  description?: string;
  startDate?: string;   // YYYY-MM-DD
  dueDate?: string;     // YYYY-MM-DD
  statusId?: number;    // you can omit if you patch status separately
  priorityId?: number;
  epicId?: number;
  assigneeIds?: number[]; // you can omit if you use /assign-users
};

// --- ADD: full update (core details) ---
export async function updateTask(
  id: number,
  body: PutTaskBody
): Promise<TaskListItemResponse> {
  const res = await api.put<TaskListItemResponse>(`/api/tasks/${id}`, body);
  return res.data;
}
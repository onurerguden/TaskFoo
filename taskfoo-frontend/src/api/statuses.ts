import api from "./client";
import type { Status } from "../types";

export async function listStatuses(): Promise<Status[]> {
  const res = await api.get<Status[]>("/api/statuses");
  return res.data;
}
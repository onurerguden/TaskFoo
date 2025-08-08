export interface NamedRef { id: number; name: string }
export interface User {
  id: number;
  name: string;
  surname?: string;
  role?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status?: NamedRef;
  priority?: { id: number; name: string; color?: string };
  project?: NamedRef;
  epic?: NamedRef & { project?: NamedRef };
  assignedUsers?: User[];
  startDate?: string;   // ISO
  dueDate?: string;     // ISO
  createdAt: string;    // ISO
}
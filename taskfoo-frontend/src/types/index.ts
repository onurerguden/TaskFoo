export type Id = number;
export type ISODate = string;

// Status
export type Status = { id: Id; name: string };

// Priority
export type Priority = { id: Id; name: string; color?: string };

// Project
export type Project = {
  id: Id;
  name: string;
  description?: string;
  startDate?: ISODate;
  dueDate?: ISODate;
  createdAt?: ISODate;
};

// Epic
export type Epic = {
  id: Id;
  name: string;
  description?: string;
  startDate?: ISODate;
  dueDate?: ISODate;
  createdAt?: ISODate;
  project?: Project;
};

// User
export type User = {
  id: Id;
  name: string;
  surname?: string;
  role?: string;
};

// Task
export type Task = {
  id: Id;
  title: string;
  description?: string;
  startDate?: ISODate;
  dueDate?: ISODate;
  createdAt: ISODate;
  status: Status;
  priority: Priority;
  epic?: Epic;
  assignedUsers?: User[];
  version: number;
};
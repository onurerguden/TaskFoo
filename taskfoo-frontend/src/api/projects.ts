import api from "./client";
export const listProjects = async () => (await api.get("/api/projects")).data;
export const createProject = async (b:{name:string;description?:string;startDate?:string;dueDate?:string}) =>
  (await api.post("/api/projects", b)).data;
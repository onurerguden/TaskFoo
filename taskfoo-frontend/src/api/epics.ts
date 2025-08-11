import api from "./client";
export const listEpics = async () => (await api.get("/api/epics")).data;
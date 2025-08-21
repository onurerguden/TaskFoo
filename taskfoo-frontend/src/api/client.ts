import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default api;
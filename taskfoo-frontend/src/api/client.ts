import axios from "axios";

const api = axios.create({
  baseURL: "/",        // proxy kullanıyorsan "/"
  timeout: 10000,
});

export default api;     // <-- DEFAULT EXPORT
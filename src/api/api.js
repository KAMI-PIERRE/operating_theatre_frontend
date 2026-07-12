import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://operating-theatre-backend.onrender.com/api",

  timeout: 35000,

  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
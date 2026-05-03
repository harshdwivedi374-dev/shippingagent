/**
 * API client — all calls to the FastAPI backend (localhost:8000)
 */
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({ baseURL: BASE });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: { email: string; full_name: string; password: string; role: string }) =>
    api.post("/auth/register", data),
};

// ─── Shipments ───────────────────────────────────────────────────────────────
export const shipmentsApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get("/shipments/", { params }),
  get: (id: string) => api.get(`/shipments/${id}`),
  create: (data: any) => api.post("/shipments/", data),
  getReasoning: (id: string) => api.get(`/shipments/${id}/reasoning`),
};

// ─── Agents ──────────────────────────────────────────────────────────────────
export const agentsApi = {
  process: (data: any) => api.post("/agents/process", data),
  complianceCheck: (data: any) => api.post("/agents/compliance/check", data),
  getRateQuotes: (data: any) => api.post("/agents/rates/quote", data),
  negotiateRates: (data: any, params?: any) =>
    api.post("/agents/rates/negotiate", data, { params }),
  handleException: (data: any) => api.post("/agents/exceptions/handle", data),
  carbonFootprint: (params: any) => api.post("/agents/sustainability/carbon", null, { params }),
  greenRoutes: (data: any, params?: any) =>
    api.post("/agents/sustainability/green-routes", data, { params }),
};

// ─── Escalations ─────────────────────────────────────────────────────────────
export const escalationsApi = {
  list: (params?: { status?: string }) => api.get("/escalations/", { params }),
  get: (id: string) => api.get(`/escalations/${id}`),
  approve: (id: string, data: { selected_option: string; human_notes?: string }) =>
    api.post(`/escalations/${id}/approve`, data),
  reject: (id: string, reason?: string) =>
    api.post(`/escalations/${id}/reject`, null, { params: { reason } }),
};

// ─── Tracking ────────────────────────────────────────────────────────────────
export const trackingApi = {
  events: (id: string) => api.get(`/tracking/${id}/events`),
  live: (id: string) => api.get(`/tracking/${id}/live`),
  exceptions: (id: string) => api.get(`/tracking/${id}/exceptions`),
};

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentsApi = {
  getForShipment: (id: string) => api.get(`/documents/shipment/${id}`),
  ocrAddress: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/documents/ocr/address", form);
  },
  ocrInvoice: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/documents/ocr/invoice", form);
  },
  scanPackage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/documents/ocr/package-scan", form);
  },
};

export default api;

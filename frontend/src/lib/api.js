import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// withCredentials globally so auth cookies flow on every request
axios.defaults.withCredentials = true;

export const api = axios.create({ baseURL: API, withCredentials: true });

// Auth
export const authRegister = (email, password, name) =>
  api.post("/auth/register", { email, password, name }).then((r) => r.data);
export const authLogin = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const authLogout = () => api.post("/auth/logout").then((r) => r.data);
export const authMe = () => api.get("/auth/me").then((r) => r.data);

// Devices
export const listDevices = () => api.get("/devices").then((r) => r.data);
export const createDevice = (name, color) =>
  api.post("/devices", { name, color }).then((r) => r.data);
export const getDevicePublic = (code) =>
  api.get(`/devices/by-code/${code}/public`).then((r) => r.data);
export const updateDevice = (id, patch) =>
  api.patch(`/devices/${id}`, patch).then((r) => r.data);
export const deleteDevice = (id) => api.delete(`/devices/${id}`).then((r) => r.data);
export const getTrack = (id, sinceMinutes) =>
  api
    .get(`/devices/${id}/track`, { params: { since_minutes: sinceMinutes } })
    .then((r) => r.data);
export const postLocation = (code, payload) =>
  api.post(`/devices/by-code/${code}/location`, payload).then((r) => r.data);

// Geofences
export const listGeofences = () => api.get("/geofences").then((r) => r.data);
export const createGeofence = (data) => api.post("/geofences", data).then((r) => r.data);
export const updateGeofence = (id, patch) =>
  api.patch(`/geofences/${id}`, patch).then((r) => r.data);
export const deleteGeofence = (id) => api.delete(`/geofences/${id}`).then((r) => r.data);

// Events
export const listEvents = (limit = 100) =>
  api.get("/events", { params: { limit } }).then((r) => r.data);

import { api } from "./client";

// ms-distritos y ms-salas devuelven el objeto directo; el resto usa { data, ... }

// ── Auth ─────────────────────────────────────────────────────
export const login   = (username, password) => api.post("/auth/login", { username, password });
export const refresh = () => api.post("/auth/refresh");
export const logout  = () => api.post("/auth/logout");

// ── Catálogos ────────────────────────────────────────────────
export const listarDistritos = () => api.get("/distritos");
export const listarSalas     = (params) => api.get("/salas", params);

// ── Audiencias ───────────────────────────────────────────────
// Devuelve { data, total, page, limit, totalPages }
export const listarAudiencias = (params) => api.get("/audiencias", params);

// Trae todas las páginas (para estadísticas y listados del panel)
export const listarTodasLasAudiencias = async (params) => {
  const limit = 500;
  let page = 1;
  let todas = [];
  for (;;) {
    const r = await api.get("/audiencias", { ...params, page, limit });
    todas = todas.concat(r.data);
    if (page >= r.totalPages) return todas;
    page += 1;
  }
};

export const audienciasTV       = (id_distrito) => api.get("/audiencias/tv", { id_distrito });
export const crearAudiencia     = (datos) => api.post("/audiencias", datos);
export const modificarAudiencia = (id, datos) => api.put(`/audiencias/${id}`, datos);
export const cambiarEstado      = (id, estado, motivo) => api.patch(`/audiencias/${id}/estado`, { estado, motivo });
export const exportarExcel      = (params) => api.blob("/audiencias/stats/export", params);

// ── Autoridades ──────────────────────────────────────────────
export const listarAutoridades  = (params) => api.get("/autoridades", { limit: 1000, ...params });
export const crearAutoridad     = (datos) => api.post("/autoridades", datos);
export const modificarAutoridad = (id, datos) => api.put(`/autoridades/${id}`, datos);
// El motivo no se guarda en la autoridad: queda registrado en la auditoría (body del request)
export const bajaAutoridad      = (id, motivo) => api.patch(`/autoridades/${id}/baja`, { motivo });
export const altaAutoridad      = (id) => api.patch(`/autoridades/${id}/alta`);

// ── Usuarios (solo Administrador) ────────────────────────────
export const listarUsuarios   = (params) => api.get("/usuarios", { limit: 100, ...params });
export const crearOperador    = (datos) => api.post("/usuarios", datos);
export const modificarOperador = (id, datos) => api.put(`/usuarios/${id}`, datos);
export const bajaOperador     = (id) => api.patch(`/usuarios/${id}/baja`);
export const altaOperador     = (id) => api.patch(`/usuarios/${id}/alta`);

// ── Auditoría (solo Administrador) ───────────────────────────
export const listarLogs = (params) => api.get("/logs", params);

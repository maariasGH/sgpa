import { api } from "./client";

// ms-distritos y ms-salas devuelven el objeto directo; el resto usa { data, ... }

// Recorre todas las páginas de un listado paginado ({ data, totalPages }).
// `limit` es el máximo que acepta cada microservicio.
const traerTodo = async (path, params, limit) => {
  let todas = [];
  for (let page = 1; ; page += 1) {
    const r = await api.get(path, { ...params, page, limit });
    todas = todas.concat(r.data);
    if (page >= r.totalPages) return todas;
  }
};

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

// Todas las páginas (listado del día en el panel)
export const listarTodasLasAudiencias = (params) => traerTodo("/audiencias", params, 500);

export const audienciasTV       = (id_distrito) => api.get("/audiencias/tv", { id_distrito });
export const crearAudiencia     = (datos) => api.post("/audiencias", datos);
export const modificarAudiencia = (id, datos) => api.put(`/audiencias/${id}`, datos);
export const cambiarEstado      = (id, estado, motivo) => api.patch(`/audiencias/${id}/estado`, { estado, motivo });
// EN_HORARIO / DEMORADA cuyo horario de fin ya pasó → REALIZADA (del distrito del operador, o todas si es Admin)
export const finalizarVencidas  = () => api.patch("/audiencias/finalizar-vencidas", {});
// Estadísticas agregadas en la base: { total, activas, por_estado, por_tipo, por_sala_activas, por_juez, por_operador, por_hora, por_distrito, ... }
export const estadisticas       = (params) => api.get("/audiencias/stats", params).then(r => r.data);
export const exportarExcel      = (params) => api.blob("/audiencias/stats/export", params);

// ── Autoridades ──────────────────────────────────────────────
// Una página: { data, total, page, limit, totalPages }
export const listarAutoridades  = (params) => api.get("/autoridades", params);
// Catálogo completo (desplegables de juez / fiscal)
export const listarTodasLasAutoridades = (params) => traerTodo("/autoridades", params, 1000);
export const crearAutoridad     = (datos) => api.post("/autoridades", datos);
export const modificarAutoridad = (id, datos) => api.put(`/autoridades/${id}`, datos);
// El motivo no se guarda en la autoridad: queda registrado en la auditoría (body del request)
export const bajaAutoridad      = (id, motivo) => api.patch(`/autoridades/${id}/baja`, { motivo });
export const altaAutoridad      = (id) => api.patch(`/autoridades/${id}/alta`);

// ── Usuarios (solo Administrador) ────────────────────────────
export const listarTodosLosUsuarios = (params) => traerTodo("/usuarios", params, 100);
export const crearOperador    = (datos) => api.post("/usuarios", datos);
export const modificarOperador = (id, datos) => api.put(`/usuarios/${id}`, datos);
export const bajaOperador     = (id, motivo) => api.patch(`/usuarios/${id}/baja`, { motivo });
export const altaOperador     = (id) => api.patch(`/usuarios/${id}/alta`);

// ── Auditoría (solo Administrador) ───────────────────────────
export const listarLogs = (params) => api.get("/logs", params);

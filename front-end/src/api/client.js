// Cliente HTTP del API Gateway.
// El JWT vive solo en memoria (nunca en localStorage): AuthProvider lo registra acá.

const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api`;

let tokenActual = null;
let alExpirarSesion = () => {};

export const setToken = (token) => { tokenActual = token; };
export const onSesionExpirada = (fn) => { alExpirarSesion = fn; };

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Error ${status}`);
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

// Arma "?a=1&b=2" ignorando valores vacíos
const query = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return qs ? `?${qs}` : "";
};

const pedir = async (method, path, { params, body, archivo } = {}) => {
  let resp;
  try {
    resp = await fetch(`${BASE}${path}${query(params)}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(tokenActual && { Authorization: `Bearer ${tokenActual}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: "No se pudo conectar con el servidor" });
  }

  if (archivo && resp.ok) return resp.blob();

  const datos = await resp.json().catch(() => null);
  if (!resp.ok) {
    // Token vencido o inválido en una ruta privada → cerrar sesión
    if (resp.status === 401 && tokenActual && path !== "/auth/login") alExpirarSesion();
    throw new ApiError(resp.status, datos);
  }
  return datos;
};

export const api = {
  get:    (path, params)       => pedir("GET",    path, { params }),
  post:   (path, body)         => pedir("POST",   path, { body }),
  put:    (path, body)         => pedir("PUT",    path, { body }),
  patch:  (path, body)         => pedir("PATCH",  path, { body }),
  blob:   (path, params)       => pedir("GET",    path, { params, archivo: true }),
};

// Mensaje legible de un error de la API (incluye detalle de superposiciones)
export const mensajeError = (err) => {
  if (!(err instanceof ApiError)) return err?.message || "Error inesperado";
  if (err.code === "SUPERPOSICION" && err.body?.conflictos?.length) {
    const detalle = err.body.conflictos
      .map(c => `${c.recurso.toLowerCase()} ocupado/a de ${String(c.hora_inicio).slice(0, 5)} a ${String(c.hora_fin).slice(0, 5)} (CUIJ ${c.cuij})`)
      .join("; ");
    return `${err.message}: ${detalle}.`;
  }
  return err.message;
};

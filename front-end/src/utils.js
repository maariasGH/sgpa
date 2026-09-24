const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Fecha de hoy (YYYY-MM-DD) en hora argentina, independiente de la zona del navegador
export const hoy = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());

export const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// "2026-08-20" → "20/08/2026"
export const fmtFecha = (d) => {
  if (!d) return "–";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

// "09:30:00" → "09:30"
export const hhmm = (hora) => (hora ? String(hora).slice(0, 5) : "–");

// "2026-08-20T10:15:00.000Z" → "20/08/2026 07:15:00" (hora argentina)
export const fmtFechaHora = (iso) => {
  if (!iso) return "–";
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(iso));
  return partes.replace(",", "");
};

export const nombreAutoridad = (a) => (a ? `${a.apellido}, ${a.nombre}` : "–");

// Aplica los guiones del CUIJ mientras se escribe: 21123456781 → 21-12345678-1
export const formatearCuij = (valor) => {
  const digitos = String(valor).replace(/\D/g, "").slice(0, 11);
  if (digitos.length > 10) return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
  if (digitos.length > 2)  return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
  return digitos;
};

// Nombre corto de sala para la vista TV y el calendario ("Sala 1 – Penal SF" → "1")
export const abrevSala = (nombre) => {
  if (!nombre) return "–";
  const sinPrefijo = nombre.replace(/Sala\s+/i, "").split("–")[0].trim();
  const numero = sinPrefijo.split(/\s+/)[0];
  if (/^\d+$/.test(numero)) return numero;
  const abrevs = { "Multipropósito": "M.P.", "Gesell": "Gesell", "Zoom": "Zoom", "U.C. 6": "U.C.6" };
  for (const [k, v] of Object.entries(abrevs)) {
    if (sinPrefijo.startsWith(k)) return v;
  }
  return sinPrefijo.length <= 6 ? sinPrefijo : sinPrefijo.slice(0, 6);
};

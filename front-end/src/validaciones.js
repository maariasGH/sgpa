// Validaciones rápidas del lado del cliente (el backend vuelve a validar todo)

// "09:30" → 570
export const aMinutos = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

export const CUIJ_REGEX = /^\d{2}-\d{8}-\d$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rango horario de las audiencias: inicio entre 07:00 y 19:00, fin hasta 19:00 y posterior al inicio.
// Devuelve el mensaje de error o null.
export const validarHorario = (inicio, fin) => {
  if (aMinutos(inicio) < aMinutos("07:00") || aMinutos(inicio) > aMinutos("19:00")) return "La hora de inicio debe estar entre las 07:00 y las 19:00 hs.";
  if (aMinutos(fin) > aMinutos("19:00")) return "La hora de fin no puede superar las 19:00 hs.";
  if (aMinutos(fin) <= aMinutos(inicio)) return "La hora de fin debe ser posterior a la de inicio.";
  return null;
};

// Formulario de alta/modificación de audiencia. Devuelve el mensaje de error o null.
export const validarAudiencia = (f) => {
  const faltan = [];
  if (!f.cuij) faltan.push("CUIJ");
  if (!f.caratula.trim()) faltan.push("carátula");
  if (!f.tipo_audiencia) faltan.push("tipo");
  if (!f.id_sala) faltan.push("sala");
  if (!f.fecha) faltan.push("fecha");
  if (!f.hora_inicio) faltan.push("hora de inicio");
  if (!f.hora_fin) faltan.push("hora de fin");
  if (!f.id_juez) faltan.push("juez");
  if (!f.id_fiscal) faltan.push("fiscal");
  if (faltan.length) return `Completá: ${faltan.join(", ")}.`;
  if (!CUIJ_REGEX.test(f.cuij)) return "El CUIJ debe tener formato XX-XXXXXXXX-X.";
  return validarHorario(f.hora_inicio, f.hora_fin);
};

// Formulario de autoridad. Devuelve el mensaje de error o null.
export const validarAutoridad = (f) => {
  if (!f.nombre.trim() || !f.apellido.trim() || !f.dni || !f.email || !f.cargo || !f.id_distrito) {
    return "Completá todos los campos obligatorios.";
  }
  if (!/^\d+$/.test(f.dni)) return "El DNI debe contener solo números.";
  if (!EMAIL_REGEX.test(f.email)) return "El email no tiene un formato válido.";
  return null;
};

// Formulario de operador. La contraseña solo es obligatoria al crear.
export const validarOperador = (f, esNuevo) => {
  if (!f.username || !f.nombre.trim() || !f.dni || !f.email || !f.id_distrito || (esNuevo && !f.password)) {
    return "Completá todos los campos obligatorios.";
  }
  if (f.password && f.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!EMAIL_REGEX.test(f.email)) return "Email inválido.";
  return null;
};

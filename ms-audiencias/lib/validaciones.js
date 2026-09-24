// Reglas de negocio puras (sin DB ni HTTP) → testeables con Jest

const CUIJ_REGEX  = /^\d{2}-\d{8}-\d$/;
const HORA_REGEX  = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const HORA_MINIMA = '07:00';
const HORA_MAXIMA = '19:00';

// Acepta "21123456781" o "21-12345678-1" y devuelve siempre "21-12345678-1"
const normalizarCuij = (valor) => {
  if (valor === undefined || valor === null) return valor;
  const texto = String(valor).trim();
  if (/^\d{11}$/.test(texto)) return `${texto.slice(0, 2)}-${texto.slice(2, 10)}-${texto.slice(10)}`;
  return texto;
};

const esCuijValido = (cuij) => typeof cuij === 'string' && CUIJ_REGEX.test(cuij);

const esHoraValida = (hora) => typeof hora === 'string' && HORA_REGEX.test(hora);

// "9:05" no es válido; "09:05" → "09:05:00"
const normalizarHora = (hora) => {
  if (!esHoraValida(hora)) return hora;
  return hora.length === 5 ? `${hora}:00` : hora;
};

// "HH:MM[:SS]" → minutos desde 00:00 (con fracción por los segundos)
const aMinutos = (hora) => {
  const [, h, m, s] = hora.match(HORA_REGEX);
  return Number(h) * 60 + Number(m) + (s ? Number(s) / 60 : 0);
};

// Devuelve un mensaje de error o null si el rango horario es válido
const validarHorario = (hora_inicio, hora_fin) => {
  if (!esHoraValida(hora_inicio)) return 'hora_inicio debe tener formato HH:MM';
  if (!esHoraValida(hora_fin))    return 'hora_fin debe tener formato HH:MM';

  const inicio = aMinutos(hora_inicio);
  const fin    = aMinutos(hora_fin);
  const min    = aMinutos(HORA_MINIMA);
  const max    = aMinutos(HORA_MAXIMA);

  if (inicio < min || inicio > max) return `hora_inicio debe estar entre ${HORA_MINIMA} y ${HORA_MAXIMA}`;
  if (fin > max)                    return `hora_fin no puede superar las ${HORA_MAXIMA}`;
  if (fin <= inicio)                return 'hora_fin debe ser mayor que hora_inicio';
  return null;
};

// Dos intervalos se solapan si inicio1 < fin2 AND inicio2 < fin1
// (un intervalo que termina exactamente cuando empieza el otro NO se solapa)
const seSolapan = (a, b) =>
  aMinutos(a.hora_inicio) < aMinutos(b.hora_fin) &&
  aMinutos(b.hora_inicio) < aMinutos(a.hora_fin);

const esFechaValida = (fecha) => {
  if (typeof fecha !== 'string' || !FECHA_REGEX.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
};

const esIdValido = (valor) => Number.isInteger(Number(valor)) && Number(valor) > 0;

module.exports = {
  HORA_MINIMA,
  HORA_MAXIMA,
  normalizarCuij,
  esCuijValido,
  esHoraValida,
  normalizarHora,
  aMinutos,
  validarHorario,
  seSolapan,
  esFechaValida,
  esIdValido,
};

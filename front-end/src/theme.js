// ─── PALETA INSTITUCIONAL ────────────────────────────────────────────────────
// Azul judicial oscuro + azul medio + blanco + grises + verde estado + rojo estado
export const C = {
  navy:    "#1A3A5C",
  blue:    "#2B6CB0",
  sky:     "#A8D4F0",
  white:   "#FFFFFF",
  bg:      "#F0F4F8",
  bgCard:  "#FFFFFF",
  border:  "#CBD5E0",
  text:    "#1A202C",
  muted:   "#718096",
  green:   "#276749",
  greenBg: "#C6F6D5",
  red:     "#9B2C2C",
  redBg:   "#FED7D7",
  yellow:  "#744210",
  yellowBg:"#FEFCBF",
  orange:  "#7B341E",
  orangeBg:"#FEEBC8",
};

export const FUENTE = "'Segoe UI', system-ui, sans-serif";

// Audiencias por página (calendario público y vista TV)
export const POR_PAGINA = 6;

export const ESTADOS = ["EN_HORARIO","DEMORADA","REALIZADA","CANCELADA","SUSPENDIDA","REPROGRAMADA"];

// Estados que no ocupan sala/juez/fiscal y no se muestran en la vista TV
export const ESTADOS_INACTIVOS = ["CANCELADA","SUSPENDIDA"];

// Estados desde los que ya no se puede modificar ni cambiar de estado
export const ESTADOS_FINALES = ["REALIZADA","CANCELADA","SUSPENDIDA"];

export const TIPOS_AUDIENCIA = [
  "Apelación de juicio",
  "Audiencia Cautelar",
  "Imputativa",
  "Imputativa con Detenido",
  "Juicio Abreviado",
  "Juicio de Debate",
  "Juicio Oral",
  "Juvenil – Art. 225",
  "Preliminar",
  "Prisión Preventiva",
];

export const TIPOS_SALA = ["PENAL","CIVIL","GESELL","MULTIPROPOSITO"];

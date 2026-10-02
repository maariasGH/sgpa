import { useId } from "react";
import { C } from "../theme";
import { useEsMovil } from "../hooks/useEsMovil";
import { useDialogo } from "../hooks/useDialogo";
import { activable } from "../a11y";

// ─── BADGE DE ESTADO ─────────────────────────────────────────────────────────
const ESTILO_ESTADO = {
  EN_HORARIO:  { bg: C.greenBg,  color: C.green,   label: "En horario" },
  DEMORADA:    { bg: C.yellowBg, color: C.yellow,  label: "Demorada"   },
  REALIZADA:   { bg: "#EBF8FF",  color: "#2C5282", label: "Realizada"  },
  CANCELADA:   { bg: C.redBg,    color: C.red,     label: "Cancelada"  },
  SUSPENDIDA:  { bg: C.orangeBg, color: C.orange,  label: "Suspendida" },
  REPROGRAMADA:{ bg: "#FAF5FF",  color: "#553C9A", label: "Reprogramada"},
};

export function EstadoBadge({ estado }) {
  const s = ESTILO_ESTADO[estado] || { bg:"#EEE", color:"#333", label: estado || "–" };
  return (
    <span style={{ background: s.bg, color: s.color, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:0.3, whiteSpace:"nowrap" }}>
      {s.label.toUpperCase()}
    </span>
  );
}

export function ActivoBadge({ activo }) {
  return (
    <span style={{ background:activo?C.greenBg:C.redBg, color:activo?C.green:C.red, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>
      {activo ? "ACTIVO" : "INACTIVO"}
    </span>
  );
}

// ─── FORMULARIOS ─────────────────────────────────────────────────────────────
const estiloLabel = { fontSize:12, fontWeight:600, color:C.navy, textTransform:"uppercase", letterSpacing:0.5 };
const estiloCampo = (disabled) => ({
  padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:14, color:C.text,
  background: disabled ? "#F7FAFC" : C.white, outline:"none", width:"100%", boxSizing:"border-box",
});

export function Label({ children, required, htmlFor }) {
  return (
    <label htmlFor={htmlFor} style={estiloLabel}>
      {children}{required && <span aria-hidden="true" style={{color:"#E53E3E"}}> *</span>}
    </label>
  );
}

export function Input({ label, value, onChange, type="text", required, placeholder, disabled, style={}, inputStyle={}, maxLength, ayuda, inputMode, autoComplete }) {
  const id = useId();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, ...style }}>
      {label && <Label required={required} htmlFor={id}>{label}</Label>}
      <input
        id={id} type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} inputMode={inputMode}
        placeholder={placeholder} disabled={disabled} required={required} maxLength={maxLength} autoComplete={autoComplete}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        style={{ ...estiloCampo(disabled), ...inputStyle }}
      />
      {ayuda && <div id={`${id}-ayuda`} style={{fontSize:11,color:C.muted}}>{ayuda}</div>}
    </div>
  );
}

export function Select({ label, value, onChange, options, required, disabled, style={}, placeholder="— Seleccionar —" }) {
  const id = useId();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, ...style }}>
      {label && <Label required={required} htmlFor={id}>{label}</Label>}
      <select id={id} value={value ?? ""} onChange={e=>onChange(e.target.value)} disabled={disabled} required={required}
        style={estiloCampo(disabled)}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function TextArea({ label, value, onChange, required, placeholder, error, rows=3 }) {
  const id = useId();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {label && <Label required={required} htmlFor={id}>{label}</Label>}
      <textarea id={id} value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        required={required} aria-invalid={error || undefined}
        style={{ ...estiloCampo(false), resize:"vertical", borderColor: error ? "#E53E3E" : C.border }} />
    </div>
  );
}

// Select compacto para barras de filtros. No tiene label visible: `etiqueta` es para lectores de pantalla.
export function FiltroSelect({ value, onChange, children, destacado, minWidth=150, etiqueta }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} aria-label={etiqueta}
      style={{ padding:"6px 10px", border:`1.5px solid ${destacado?C.blue:C.border}`, borderRadius:6, fontSize:13,
        color: destacado ? C.navy : C.text, fontWeight: destacado ? 600 : 400, minWidth, background:C.white }}>
      {children}
    </select>
  );
}

// ─── BOTONES, CONTENEDORES Y AVISOS ──────────────────────────────────────────
// En botones que solo muestran un ícono, `title` también se usa como nombre accesible
export function Btn({ children, onClick, variant="primary", size="md", style={}, disabled=false, type="button", title, ...otros }) {
  const base = { border:"none", borderRadius:6, cursor: disabled?"not-allowed":"pointer", fontWeight:600, transition:"opacity .15s", opacity: disabled?0.5:1 };
  const sz = size==="sm" ? { padding:"5px 12px", fontSize:12 } : size==="lg" ? { padding:"11px 24px", fontSize:15 } : { padding:"8px 18px", fontSize:13 };
  const v = variant==="primary"   ? { background:C.blue,  color:C.white }
           : variant==="danger"   ? { background:"#C53030", color:C.white }
           : variant==="success"  ? { background:"#276749", color:C.white }
           : variant==="ghost"    ? { background:"transparent", color:C.blue, border:`1.5px solid ${C.blue}` }
           :                        { background:C.bg, color:C.text, border:`1.5px solid ${C.border}` };
  return (
    <button type={type} title={title} aria-label={title} {...otros} onClick={onClick} disabled={disabled} style={{...base,...sz,...v,...style}}>
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, width=560 }) {
  const ref = useDialogo(onClose);
  const idTitulo = useId();
  return (
    <div className="modal-fondo" onClick={e=>{ if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div ref={ref} tabIndex={-1} className="modal-caja" role="dialog" aria-modal="true" aria-labelledby={idTitulo}
        style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.3)", outline:"none" }}>
        <div className="modal-cabecera" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"18px 24px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.white, zIndex:1 }}>
          <h3 id={idTitulo} style={{ margin:0, fontSize:17, color:C.navy, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:"none", border:"none", fontSize:26, cursor:"pointer", color:C.muted, lineHeight:1, minWidth:32, minHeight:32 }}>×</button>
        </div>
        <div className="modal-cuerpo" style={{ padding:"20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Alert({ type="info", children }) {
  const map = { info:{bg:"#EBF8FF",color:"#2C5282",border:"#BEE3F8"}, error:{bg:C.redBg,color:C.red,border:"#FEB2B2"}, success:{bg:C.greenBg,color:C.green,border:"#9AE6B4"} };
  const s = map[type];
  return <div role={type==="error"?"alert":"status"} style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`, borderRadius:6, padding:"10px 14px", fontSize:13, marginBottom:12 }}>{children}</div>;
}

export function Card({ children, style={} }) {
  return <div style={{ background:C.white, borderRadius:8, border:`1px solid ${C.border}`, boxShadow:"0 1px 3px rgba(0,0,0,.06)", ...style }}>{children}</div>;
}

export function Vacio({ icono="📋", titulo, subtitulo }) {
  return (
    <div style={{ padding:44, textAlign:"center", color:C.muted }}>
      <div style={{ fontSize:38, marginBottom:8 }}>{icono}</div>
      <div style={{ fontWeight:600 }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize:13 }}>{subtitulo}</div>}
    </div>
  );
}

export function Cargando({ texto="Cargando…" }) {
  return <div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:13 }}>{texto}</div>;
}

// Encabezado de tabla estándar del panel
export function Th({ children }) {
  return (
    <th scope="col" style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.4, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>
      {children}
    </th>
  );
}

// ─── PAGINADOR ───────────────────────────────────────────────────────────────
export function Paginador({ pagina, totalPags, onCambiar, compacto=false }) {
  const esMovil = useEsMovil();
  if (totalPags <= 1) return null;
  // En teléfono: flechas grandes + "n / total" en lugar de la lista de números
  const corto = compacto || esMovil;
  const btn = (activo, extra={}) => ({
    padding: esMovil ? "8px 14px" : corto ? "3px 8px" : "4px 10px", border:`1px solid ${C.border}`, borderRadius: corto ? 4 : 5,
    background: activo ? C.white : "#F7FAFC", cursor: activo ? "pointer" : "default",
    fontSize: esMovil ? 14 : 12, color: activo ? C.navy : C.muted, fontWeight: corto ? 400 : 600, ...extra,
  });
  const primera = pagina > 0, ultima = pagina < totalPags - 1;
  return (
    <nav aria-label="Paginación" style={{ display:"flex", alignItems:"center", gap:4 }}>
      <button onClick={()=>onCambiar(0)} disabled={!primera} aria-label="Primera página" style={btn(primera)}>{corto ? "«" : "« Primera"}</button>
      <button onClick={()=>onCambiar(pagina-1)} disabled={!primera} aria-label="Página anterior" style={btn(primera)}>{corto ? "‹" : "‹ Anterior"}</button>
      {esMovil && <span aria-live="polite" style={{ fontSize:13, color:C.muted, padding:"0 8px", whiteSpace:"nowrap" }}>{pagina+1} / {totalPags}</span>}
      {compacto && !esMovil && Array.from({ length: totalPags }).map((_, i) => (
        <button key={i} onClick={()=>onCambiar(i)} aria-label={`Página ${i+1}`} aria-current={i===pagina ? "page" : undefined}
          style={btn(true, { padding:"3px 9px", borderColor: i===pagina?C.blue:C.border, background: i===pagina?C.blue:C.white, color: i===pagina?C.white:C.navy, fontWeight: i===pagina?700:400 })}>
          {i+1}
        </button>
      ))}
      <button onClick={()=>onCambiar(pagina+1)} disabled={!ultima} aria-label="Página siguiente" style={btn(ultima)}>{corto ? "›" : "Siguiente ›"}</button>
      <button onClick={()=>onCambiar(totalPags-1)} disabled={!ultima} aria-label="Última página" style={btn(ultima)}>{corto ? "»" : "Última »"}</button>
    </nav>
  );
}

// ─── SELECTOR DE FECHA CON FLECHAS ───────────────────────────────────────────
export function SelectorFecha({ fecha, onCambiar, hoy, sumarDias }) {
  const esMovil = useEsMovil();
  const flecha = esMovil ? { padding:"9px 13px" } : {};
  return (
    <div className="filtro-ancho" style={{ display:"flex", gap:4, alignItems:"center" }}>
      <Btn onClick={()=>onCambiar(sumarDias(fecha,-1))} variant="outline" size="sm" title="Día anterior" style={flecha}>◀</Btn>
      <input type="date" aria-label="Fecha" value={fecha} onChange={e=>e.target.value && onCambiar(e.target.value)}
        style={{ padding:"6px 10px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:13, color:C.text, background:C.white, minWidth:0, flex: esMovil ? 1 : "none" }} />
      <Btn onClick={()=>onCambiar(sumarDias(fecha,1))} variant="outline" size="sm" title="Día siguiente" style={flecha}>▶</Btn>
      <Btn onClick={()=>onCambiar(hoy())} variant="outline" size="sm" style={flecha}>Hoy</Btn>
    </div>
  );
}

// ─── LISTAS EN TELÉFONO ──────────────────────────────────────────────────────
// Reemplaza a una fila de tabla cuando la pantalla es angosta
export function ItemMovil({ children, onClick, seleccionado, apagado }) {
  return (
    <div {...(onClick ? activable(onClick) : {})} style={{
      padding:"12px 14px", borderBottom:`1px solid ${C.border}`, cursor: onClick ? "pointer" : "default",
      background: seleccionado ? "#DBEAFE" : C.white, opacity: apagado ? .55 : 1,
    }}>
      {children}
    </div>
  );
}

// Par etiqueta/valor compacto dentro de un ItemMovil
export function DatoMovil({ label, children }) {
  return (
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.4 }}>{label}</div>
      <div style={{ fontSize:13, color:C.text, overflowWrap:"anywhere" }}>{children}</div>
    </div>
  );
}

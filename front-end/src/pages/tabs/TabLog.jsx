import { useState } from "react";
import { C } from "../../theme";
import { fmtFechaHora } from "../../utils";
import { useCarga } from "../../hooks/useCarga";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import { Alert, Btn, Card, Cargando, FiltroSelect, Paginador } from "../../components/ui";

const POR_PAGINA = 25;
const ACCIONES = ["ALTA","MODIFICACION","BAJA","LOGIN","LOGOUT"];
const ENTIDADES = ["AUDIENCIA","AUTORIDAD","USUARIO","SALA","DISTRITO","SESION"];

const COLOR_ACCION = {
  ALTA:        { bg:C.greenBg,  c:C.green },
  BAJA:        { bg:C.redBg,    c:C.red },
  MODIFICACION:{ bg:C.yellowBg, c:C.yellow },
  LOGIN:       { bg:"#EBF8FF",  c:"#2C5282" },
  LOGOUT:      { bg:"#F7FAFC",  c:C.muted },
};

// Campos que no aportan al detalle legible
const IGNORAR = new Set(["created_at","updated_at","sala","juez","fiscal","rol","id_estado"]);
const CAMPOS_ACTIVO = new Set(["estado","activo","activa"]);

// Identificación corta del registro según la entidad
const titulo = (entidad, x) => {
  if (!x) return "";
  switch (entidad) {
    case "AUDIENCIA": return `CUIJ ${x.cuij} | ${x.caratula}`;
    case "AUTORIDAD": return `${x.cargo} ${x.apellido}, ${x.nombre}`;
    case "USUARIO":   return `${x.username} (${x.nombre})`;
    default:          return x.nombre ?? "";
  }
};

const valor = (v, campo) => {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return CAMPOS_ACTIVO.has(campo) ? (v ? "ACTIVO" : "INACTIVO") : (v ? "sí" : "no");
  return String(v);
};

// Texto legible del registro a partir del snapshot antes/después que guarda el gateway
const describir = (l) => {
  if (l.tipo_accion === "LOGIN")  return "Inicio de sesión";
  if (l.tipo_accion === "LOGOUT") return "Cierre de sesión";

  const { antes, despues } = l.detalle ?? {};
  const partes = [titulo(l.entidad, despues ?? antes)];

  if (antes && despues) {
    const cambios = Object.keys(despues)
      .filter(k => !IGNORAR.has(k) && typeof despues[k] !== "object" && valor(antes[k], k) !== valor(despues[k], k))
      .map(k => `${k}: ${valor(antes[k], k)} → ${valor(despues[k], k)}`);
    partes.push(cambios.length ? cambios.join(" | ") : "Sin cambios detectados");
  }
  // Motivo de la baja de autoridad (no se guarda en la entidad, solo en el request)
  const motivo = l.request?.body?.motivo;
  if (motivo && despues?.motivo_cambio !== motivo) partes.push(`Motivo: ${motivo}`);

  return partes.filter(Boolean).join(" | ");
};

// ─── TAB AUDITORÍA (solo lectura, solo Administrador) ────────────────────────
export default function TabLog() {
  const [filtros, setFiltros] = useState({ usuario:"", tipo_accion:"", entidad:"", desde:"", hasta:"" });
  const [pagina, setPagina] = useState(0);

  const cambiar = (k, v) => { setFiltros(f => ({ ...f, [k]: v })); setPagina(0); };
  const hayFiltros = Object.values(filtros).some(Boolean);

  const { datos: usuarios } = useCarga(() => sgpa.listarUsuarios().then(r => r.data), [], []);
  const { datos, error, cargando } = useCarga(
    () => sgpa.listarLogs({ ...filtros, page: pagina + 1, limit: POR_PAGINA }),
    [filtros, pagina],
  );
  const logs = datos?.data ?? [];
  const total = datos?.total ?? 0;

  const username = (id) => usuarios.find(u => u.id_usuario === id)?.username ?? (id === 0 ? "debug" : `#${id}`);

  const inputFecha = { padding:"6px 10px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:13 };

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, color:C.navy, fontWeight:800, flex:1 }}>Log de auditoría</h2>
        <span style={{ fontSize:12, color:C.muted }}>{total} registro{total!==1?"s":""}</span>
      </div>
      <Alert type="info">Solo lectura — cada acción del sistema queda registrada automáticamente por el API Gateway.</Alert>
      {error && <Alert type="error">{mensajeError(error)}</Alert>}

      <Card style={{ padding:"12px 16px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
        <FiltroSelect value={filtros.usuario} onChange={v=>cambiar("usuario", v)}>
          <option value="">Todos los usuarios</option>
          {usuarios.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.username}</option>)}
        </FiltroSelect>
        <FiltroSelect value={filtros.tipo_accion} onChange={v=>cambiar("tipo_accion", v)}>
          <option value="">Todas las acciones</option>
          {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
        </FiltroSelect>
        <FiltroSelect value={filtros.entidad} onChange={v=>cambiar("entidad", v)}>
          <option value="">Todas las entidades</option>
          {ENTIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </FiltroSelect>
        <label style={{ fontSize:12, color:C.muted }}>Desde <input type="date" value={filtros.desde} onChange={e=>cambiar("desde", e.target.value)} style={inputFecha} /></label>
        <label style={{ fontSize:12, color:C.muted }}>Hasta <input type="date" value={filtros.hasta} onChange={e=>cambiar("hasta", e.target.value)} style={inputFecha} /></label>
        {hayFiltros && <Btn size="sm" variant="outline" onClick={()=>{ setFiltros({ usuario:"", tipo_accion:"", entidad:"", desde:"", hasta:"" }); setPagina(0); }}>Limpiar</Btn>}
      </Card>

      <Card style={{ overflow:"hidden" }}>
        {cargando && !logs.length ? <Cargando /> : (
          <div style={{ overflowX:"auto", opacity: cargando ? .6 : 1 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {["Fecha y hora","Usuario","Acción","Entidad afectada","Detalle","IP"].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:C.white, letterSpacing:.4, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.15)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:C.muted }}>Sin registros para los filtros aplicados</td></tr>
                ) : logs.map((l, i) => {
                  const s = COLOR_ACCION[l.tipo_accion] || { bg:"#EEE", c:"#333" };
                  return (
                    <tr key={l.id_log} style={{ background:i%2===0?C.white:"#FAFCFF", borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11, whiteSpace:"nowrap", color:C.muted }}>{fmtFechaHora(l.fecha_hora)}</td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:C.navy, whiteSpace:"nowrap" }}>{username(l.id_usuario)}</td>
                      <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                        <span style={{ background:s.bg, color:s.c, padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700 }}>{l.tipo_accion}</span>
                      </td>
                      <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                        <span style={{ background:"#EBF8FF", color:"#2C5282", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{l.entidad}</span>
                        {l.id_entidad != null && <span style={{ marginLeft:5, fontSize:11, color:C.muted, fontFamily:"monospace" }}>#{l.id_entidad}</span>}
                      </td>
                      <td style={{ padding:"9px 12px", fontSize:12, color:C.text, lineHeight:1.4 }}>{describir(l)}</td>
                      <td style={{ padding:"9px 12px", fontSize:11, color:C.muted, fontFamily:"monospace", whiteSpace:"nowrap" }}>{l.ip_origen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {datos?.totalPages > 1 && (
          <div style={{ padding:"12px 18px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#FAFCFF", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:12, color:C.muted }}>Página {pagina+1} de {datos.totalPages}</span>
            <Paginador pagina={pagina} totalPags={datos.totalPages} onCambiar={setPagina} />
          </div>
        )}
      </Card>
    </div>
  );
}

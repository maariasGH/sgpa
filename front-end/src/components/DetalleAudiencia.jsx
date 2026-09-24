import { C } from "../theme";
import { fmtFecha, hhmm, nombreAutoridad } from "../utils";
import { EstadoBadge } from "./ui";

// Drawer lateral con el detalle de una audiencia (vista pública y panel interno)
// `filasExtra`: [[titulo, valor], ...]  ·  `pie`: contenido del pie (acciones)
export default function DetalleAudiencia({ audiencia: a, onCerrar, filasExtra = [], pie }) {
  const filas = [
    ["Fecha",   fmtFecha(a.fecha)],
    ["Horario", `${hhmm(a.hora_inicio)} – ${hhmm(a.hora_fin)}`],
    ["Sala",    a.sala?.nombre ?? "–"],
    ["Tipo de audiencia", a.tipo_audiencia],
    ...filasExtra,
  ];

  const intervinientes = [
    { rol:"Juez/a",     nombre: nombreAutoridad(a.juez),   icon:"⚖️", color:"#2C5282", bg:"#EBF8FF" },
    { rol:"Fiscal",     nombre: nombreAutoridad(a.fiscal), icon:"🏛️", color:"#553C9A", bg:"#FAF5FF" },
    { rol:"Defensor/a", nombre: a.defensor || "No designado/a", icon:"🛡️", color: a.defensor ? C.text : C.muted, bg:"#F7FAFC" },
  ];

  return (
    <>
      <div onClick={onCerrar} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", zIndex:200 }} />
      <aside style={{
        position:"fixed", top:0, right:0, bottom:0, width:"min(480px,100vw)",
        background:C.white, zIndex:201, boxShadow:"-4px 0 32px rgba(0,0,0,.18)",
        display:"flex", flexDirection:"column", overflowY:"auto",
      }}>
        {/* Cabecera */}
        <div style={{ background:C.navy, padding:"20px 24px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:C.sky, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Detalle de audiencia</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.white, lineHeight:1.3 }}>{a.caratula}</div>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar" style={{ background:"rgba(255,255,255,.15)", border:"none", color:C.white, width:32, height:32, borderRadius:6, cursor:"pointer", fontSize:18, lineHeight:1, flexShrink:0, marginTop:2 }}>×</button>
          </div>
          <div style={{ marginTop:14 }}><EstadoBadge estado={a.estado} /></div>
        </div>

        {/* Cuerpo */}
        <div style={{ padding:24, flex:1 }}>
          <div style={{ background:"#F0F4F8", border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.5, marginBottom:2 }}>CUIJ</div>
            <div style={{ fontSize:17, fontWeight:800, color:C.navy, fontFamily:"monospace", letterSpacing:.5 }}>{a.cuij}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:20 }}>
            {filas.map(([k, v], idx) => {
              const ultimaFila = idx >= filas.length - (filas.length % 2 === 0 ? 2 : 1);
              const sola = filas.length % 2 === 1 && idx === filas.length - 1;
              return (
                <div key={k} style={{
                  padding:"12px 16px", background: idx%2===0 ? "#FAFCFF" : C.white,
                  borderBottom: ultimaFila ? "none" : `1px solid ${C.border}`,
                  borderRight: idx%2===0 && !sola ? `1px solid ${C.border}` : "none",
                  gridColumn: sola ? "1/-1" : "auto",
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.4, marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{v}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.5, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ display:"inline-block", width:3, height:14, background:C.blue, borderRadius:2 }}/>
              Autoridades intervinientes
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {intervinientes.map(({ rol, nombre, icon, color, bg }) => (
                <div key={rol} style={{ background:bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.4 }}>{rol}</div>
                    <div style={{ fontSize:14, fontWeight:600, color }}>{nombre}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {a.motivo_cambio && (
            <div style={{ background:C.orangeBg, border:"1px solid #FBD38D", borderRadius:8, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.orange, textTransform:"uppercase", letterSpacing:.4, marginBottom:4 }}>
                ⚠️ Motivo {a.estado ? `de ${a.estado.toLowerCase()}` : ""}
              </div>
              <div style={{ fontSize:14, color:C.text, lineHeight:1.5 }}>{a.motivo_cambio}</div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
          {pie}
        </div>
      </aside>
    </>
  );
}

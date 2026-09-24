import { useEffect, useRef, useState } from "react";
import { C, FUENTE, POR_PAGINA } from "../theme";
import { hhmm, abrevSala } from "../utils";
import { useCarga } from "../hooks/useCarga";
import * as sgpa from "../api/sgpa";
import Balanza from "../components/Balanza";

const REFRESCO_MS = 60 * 1000;   // recarga de datos
const PAGINA_MS   = 15 * 1000;   // avance automático de página

const ESTADO_TV = {
  EN_HORARIO:   { bg:"#22543D", color:"#9AE6B4", label:"EN HORARIO" },
  DEMORADA:     { bg:"#7B341E", color:"#FBD38D", label:"DEMORADA"   },
  REALIZADA:    { bg:"#1A365D", color:"#90CDF4", label:"REALIZADA"  },
  REPROGRAMADA: { bg:"#44337A", color:"#D6BCFA", label:"REPROGRAMADA"},
};

const pad = n => String(n).padStart(2, "0");

// ─── VISTA TV ────────────────────────────────────────────────────────────────
// Audiencias de hoy (sin canceladas/suspendidas) del distrito del operador;
// el administrador ve todos los distritos.
export default function VistaTV({ id_distrito, nombreDistrito, onSalir }) {
  const [pagina, setPagina] = useState(0);
  const [ahora, setAhora]   = useState(() => new Date());
  const [refresco, setRefresco] = useState(0);
  const tvRef = useRef(null);

  const { datos } = useCarga(() => sgpa.audienciasTV(id_distrito), [id_distrito, refresco], { data: [] });
  const aud = datos?.data ?? [];

  const totalPags = Math.max(1, Math.ceil(aud.length / POR_PAGINA));
  const paginaVisible = pagina % totalPags;
  const pagActual = aud.slice(paginaVisible * POR_PAGINA, (paginaVisible + 1) * POR_PAGINA);

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Recarga de datos cada 60 s
  useEffect(() => {
    const t = setInterval(() => setRefresco(r => r + 1), REFRESCO_MS);
    return () => clearInterval(t);
  }, []);

  // Avance automático de página cada 15 s
  useEffect(() => {
    if (totalPags <= 1) return undefined;
    const t = setInterval(() => setPagina(p => (p + 1) % totalPags), PAGINA_MS);
    return () => clearInterval(t);
  }, [totalPags]);

  // Pantalla completa mientras la vista esté abierta
  useEffect(() => {
    tvRef.current?.requestFullscreen?.().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);

  const hora = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
  const fechaStr = ahora.toLocaleDateString("es-AR", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  return (
    <div ref={tvRef} style={{ position:"fixed", inset:0, background:"#0A1628", color:C.white, fontFamily:FUENTE, display:"flex", flexDirection:"column", overflow:"hidden", zIndex:9999 }}>
      {/* Header */}
      <div style={{ background:"#0D1F3C", padding:"14px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"2px solid #1E3A5F", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <Balanza size={52} radius={8} />
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:.3 }}>Poder Judicial – Santa Fe</div>
            <div style={{ fontSize:13, color:C.sky, letterSpacing:1, textTransform:"uppercase" }}>Sistema de Gestión de Audiencias · {nombreDistrito}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:42, fontWeight:800, fontFamily:"monospace", letterSpacing:2 }}>{hora}</div>
          <div style={{ fontSize:13, color:C.sky, textTransform:"capitalize" }}>{fechaStr}</div>
        </div>
      </div>

      {/* Subtítulo */}
      <div style={{ background:C.navy, padding:"10px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:.5 }}>📋 Audiencias del día</div>
        {totalPags > 1 && (
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {Array.from({ length: totalPags }).map((_, i) => (
              <div key={i} onClick={()=>setPagina(i)} style={{ width:10, height:10, borderRadius:"50%", background: i===paginaVisible ? C.sky : "rgba(168,212,240,.3)", cursor:"pointer", transition:"background .3s" }}/>
            ))}
            <span style={{ fontSize:13, color:C.sky, marginLeft:4 }}>Pág. {paginaVisible+1} / {totalPags}</span>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div style={{ flex:1, padding:"20px 40px", overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {aud.length === 0 ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"rgba(168,212,240,.5)" }}>
            <div style={{ fontSize:80, marginBottom:20 }}>📋</div>
            <div style={{ fontSize:32, fontWeight:700 }}>Sin audiencias programadas para hoy</div>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:"0 8px", tableLayout:"fixed" }}>
            <thead>
              <tr style={{ color:C.sky, fontSize:14, textTransform:"uppercase", letterSpacing:1 }}>
                <th style={{ padding:"0 16px 8px", textAlign:"left", width:120 }}>Horario</th>
                <th style={{ padding:"0 16px 8px", textAlign:"left", width:110 }}>Sala</th>
                <th style={{ padding:"0 16px 8px", textAlign:"left", width:170 }}>Juez/a</th>
                <th style={{ padding:"0 16px 8px", textAlign:"left", width:170 }}>Fiscal</th>
                <th style={{ padding:"0 16px 8px", textAlign:"left" }}>Carátula</th>
                <th style={{ padding:"0 16px 8px", textAlign:"left", width:160 }}>Tipo</th>
                <th style={{ padding:"0 16px 8px", textAlign:"center", width:170 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagActual.map(a => {
                const est = ESTADO_TV[a.estado] || { bg:"#1A2A3A", color:"#A0AEC0", label:a.estado };
                return (
                  <tr key={a.id_audiencia} style={{ background:"#0D1F3C" }}>
                    <td style={{ padding:"18px 16px", fontSize:28, fontWeight:800, borderRadius:"10px 0 0 10px", borderLeft:`4px solid ${est.color}` }}>
                      {hhmm(a.hora_inicio)}
                      <div style={{ fontSize:14, fontWeight:400, color:C.sky }}>→ {hhmm(a.hora_fin)}</div>
                    </td>
                    <td style={{ padding:"18px 12px", overflow:"hidden" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:C.sky, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{abrevSala(a.sala?.nombre)}</div>
                      <div style={{ fontSize:11, color:"rgba(168,212,240,.5)", marginTop:2, whiteSpace:"nowrap" }}>{a.sala?.tipo ?? ""}</div>
                    </td>
                    <td style={{ padding:"18px 16px", fontSize:17 }}>
                      {a.juez ? <><div style={{fontWeight:700}}>{a.juez.apellido}</div><div style={{fontSize:13,color:C.sky}}>{a.juez.nombre}</div></> : "–"}
                    </td>
                    <td style={{ padding:"18px 16px", fontSize:17 }}>
                      {a.fiscal ? <><div style={{fontWeight:700}}>{a.fiscal.apellido}</div><div style={{fontSize:13,color:C.sky}}>{a.fiscal.nombre}</div></> : "–"}
                    </td>
                    <td style={{ padding:"18px 16px", fontSize:16, lineHeight:1.4, color:"#E2E8F0" }}>{a.caratula}</td>
                    <td style={{ padding:"18px 16px", fontSize:14, color:C.sky, lineHeight:1.3 }}>{a.tipo_audiencia}</td>
                    <td style={{ padding:"18px 16px", textAlign:"center", borderRadius:"0 10px 10px 0" }}>
                      <div style={{ background:est.bg, color:est.color, padding:"8px 14px", borderRadius:8, fontSize:14, fontWeight:800, letterSpacing:1, display:"inline-block" }}>{est.label}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ background:"#0D1F3C", padding:"10px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #1E3A5F", flexShrink:0 }}>
        <div style={{ fontSize:12, color:"rgba(168,212,240,.4)", letterSpacing:.5 }}>
          Actualización automática cada 60 s · Avance de página cada 15 s · {aud.length} audiencia{aud.length!==1?"s":""} activas hoy
        </div>
        <button onClick={onSalir} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(168,212,240,.2)", color:"rgba(168,212,240,.5)", padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer", letterSpacing:.5 }}>
          ✕ Salir de vista TV
        </button>
      </div>
    </div>
  );
}

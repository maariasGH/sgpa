import { useState } from "react";
import { C, FUENTE } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useCarga } from "../hooks/useCarga";
import * as sgpa from "../api/sgpa";
import Balanza from "../components/Balanza";
import { Btn } from "../components/ui";
import VistaTV from "./VistaTV";
import TabAudiencias from "./tabs/TabAudiencias";
import TabAutoridades from "./tabs/TabAutoridades";
import TabEstadisticas from "./tabs/TabEstadisticas";
import TabUsuarios from "./tabs/TabUsuarios";
import TabLog from "./tabs/TabLog";

// ─── PANEL INTERNO ───────────────────────────────────────────────────────────
export default function Panel() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const [tab, setTab] = useState("audiencias");
  const [vistaTV, setVistaTV] = useState(false);

  // Catálogos compartidos por las pestañas. Para el operador, el gateway
  // devuelve solo las salas de su distrito.
  const { datos: distritos } = useCarga(() => sgpa.listarDistritos(), [], []);
  const { datos: salas }     = useCarga(() => sgpa.listarSalas(), [], []);

  const nombreDistrito = (id) => distritos.find(d => d.id_distrito === id)?.nombre ?? "–";
  const ctx = { usuario, esAdmin, distritos, salas, nombreDistrito };

  const tabs = [
    { id:"audiencias",   label:"📋 Audiencias" },
    { id:"autoridades",  label:"⚖️ Autoridades" },
    { id:"estadisticas", label:"📊 Estadísticas" },
    ...(esAdmin ? [{ id:"usuarios", label:"👤 Operadores" }, { id:"log", label:"📜 Auditoría" }] : []),
  ];

  if (vistaTV) {
    return (
      <VistaTV
        id_distrito={esAdmin ? undefined : usuario.id_distrito}
        nombreDistrito={esAdmin ? "Todos los distritos" : nombreDistrito(usuario.id_distrito)}
        onSalir={()=>setVistaTV(false)}
      />
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FUENTE }}>
      <header style={{ background:C.navy, color:C.white, padding:"0 20px", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 8px rgba(0,0,0,.2)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", height:56, gap:16 }}>
          <Balanza size={32} radius={5} />
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:.3 }}>SGPA</div>
          <nav style={{ flex:1, display:"flex", gap:2, overflowX:"auto" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ background: tab===t.id ? "rgba(255,255,255,.15)" : "transparent", color: tab===t.id ? C.white : C.sky, border:"none", borderRadius:5, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:700 }}>{usuario.nombre}</div>
              <div style={{ fontSize:10, color:C.sky }}>{usuario.rol}{usuario.id_distrito ? ` · ${nombreDistrito(usuario.id_distrito)}` : ""}</div>
            </div>
            <button onClick={()=>setVistaTV(true)} style={{ background:"rgba(168,212,240,.15)", border:"1px solid rgba(168,212,240,.35)", color:C.sky, padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:.3 }}>
              📺 Vista TV
            </button>
            <Btn onClick={()=>cerrarSesion()} variant="ghost" size="sm" style={{ color:C.sky, borderColor:"rgba(168,212,240,.4)", fontSize:11 }}>Salir</Btn>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"20px 16px" }}>
        {tab==="audiencias"   && <TabAudiencias {...ctx} />}
        {tab==="autoridades"  && <TabAutoridades {...ctx} />}
        {tab==="estadisticas" && <TabEstadisticas {...ctx} />}
        {tab==="usuarios" && esAdmin && <TabUsuarios {...ctx} />}
        {tab==="log"      && esAdmin && <TabLog {...ctx} />}
      </main>
    </div>
  );
}

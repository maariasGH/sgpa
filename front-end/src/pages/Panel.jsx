import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router";
import { C, FUENTE } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useCarga } from "../hooks/useCarga";
import { useEsMovil } from "../hooks/useEsMovil";
import { useDialogo } from "../hooks/useDialogo";
import * as sgpa from "../api/sgpa";
import LogoPoderJudicial from "../components/LogoPoderJudicial";
import { Btn } from "../components/ui";
import VistaTV from "./VistaTV";
import TabAudiencias from "./tabs/TabAudiencias";
import TabAutoridades from "./tabs/TabAutoridades";
import TabEstadisticas from "./tabs/TabEstadisticas";
import TabUsuarios from "./tabs/TabUsuarios";
import TabLog from "./tabs/TabLog";

// Pestañas del panel: cada una es una ruta /panel/<ruta>
const PESTANIAS = [
  { ruta:"audiencias",   icono:"📋", label:"Audiencias",   Componente: TabAudiencias },
  { ruta:"autoridades",  icono:"⚖️", label:"Autoridades",  Componente: TabAutoridades },
  { ruta:"estadisticas", icono:"📊", label:"Estadísticas", Componente: TabEstadisticas },
  { ruta:"operadores",   icono:"👤", label:"Operadores",   Componente: TabUsuarios, soloAdmin: true },
  { ruta:"auditoria",    icono:"📜", label:"Auditoría",    Componente: TabLog,      soloAdmin: true },
];

// ─── PANEL INTERNO ───────────────────────────────────────────────────────────
export default function Panel() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  // Por debajo de este ancho las pestañas no entran junto al usuario: pasan a una segunda fila
  const compacto = useEsMovil(900);
  // En teléfono las pestañas, el usuario y las acciones pasan a un menú lateral
  const esMovil = useEsMovil();
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Al pasar a escritorio (rotar, redimensionar) el menú lateral deja de existir
  if (!esMovil && menuAbierto) setMenuAbierto(false);

  // Catálogos compartidos por las pestañas. Para el operador, el gateway
  // devuelve solo las salas de su distrito.
  const { datos: distritos } = useCarga(() => sgpa.listarDistritos(), [], []);
  const { datos: salas }     = useCarga(() => sgpa.listarSalas(), [], []);

  const nombreDistrito = (id) => distritos.find(d => d.id_distrito === id)?.nombre ?? "–";
  const ctx = { usuario, esAdmin, distritos, salas, nombreDistrito };
  const pestanias = PESTANIAS.filter(p => esAdmin || !p.soloAdmin);

  // Primero se sale a la vista pública; si no, RequiereSesion mandaría al login
  const salir = () => { navigate("/"); cerrarSesion(); };

  const nav = (
    <nav aria-label="Secciones del panel" className="nav-scroll" style={{ flex:1, display:"flex", gap:2, minWidth:0 }}>
      {pestanias.map(p => (
        <NavLink key={p.ruta} to={`/panel/${p.ruta}`} style={({ isActive }) => ({
          background: isActive ? "rgba(255,255,255,.15)" : "transparent", color: isActive ? C.white : C.sky,
          borderRadius:5, padding: compacto ? "9px 12px" : "6px 14px", fontSize:12, fontWeight:600,
          whiteSpace:"nowrap", flexShrink:0, textDecoration:"none",
        })}>
          <span aria-hidden="true">{p.icono}</span> {p.label}
        </NavLink>
      ))}
    </nav>
  );

  const layout = (contenido) => (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FUENTE }}>
      <header style={{ background:C.navy, color:C.white, padding: compacto ? "0 12px" : "0 20px", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 8px rgba(0,0,0,.2)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", height: compacto ? 52 : 56, gap: compacto ? 10 : 16 }}>
          {esMovil && (
            <button onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" title="Menú" aria-expanded={menuAbierto} aria-controls="menu-lateral"
              style={{ background:"none", border:"none", color:C.white, fontSize:24, lineHeight:1, cursor:"pointer", minWidth:40, minHeight:40, marginLeft:-6 }}>
              <span aria-hidden="true">☰</span>
            </button>
          )}
          <LogoPoderJudicial alto={36} />
          {!esMovil && <div style={{ fontSize:13, fontWeight:700, letterSpacing:.3 }}>SGPA</div>}
          {compacto ? <div style={{ flex:1 }} /> : nav}
          {!esMovil && <div style={{ display:"flex", alignItems:"center", gap: compacto ? 6 : 10, flexShrink:0, minWidth:0 }}>
            {!esMovil && <div style={{ textAlign:"right", minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth: compacto ? 110 : 220 }}>{usuario.nombre}</div>
              <div style={{ fontSize:10, color:C.sky, whiteSpace:"nowrap" }}>{usuario.rol}{usuario.id_distrito ? ` · ${nombreDistrito(usuario.id_distrito)}` : ""}</div>
            </div>}
            <Link to="/panel/tv" title="Vista TV" aria-label="Vista TV" style={{ background:"rgba(168,212,240,.15)", border:"1px solid rgba(168,212,240,.35)", color:C.sky, padding: compacto ? "7px 9px" : "5px 12px", borderRadius:6, fontSize:11, fontWeight:700, letterSpacing:.3, whiteSpace:"nowrap", textDecoration:"none" }}>
              <span aria-hidden="true">📺</span>{!compacto && " Vista TV"}
            </Link>
            <Btn onClick={salir} variant="ghost" size="sm" style={{ color:C.sky, borderColor:"rgba(168,212,240,.4)", fontSize:11, ...(compacto && { padding:"7px 10px" }) }}>Salir</Btn>
          </div>}
        </div>
        {compacto && !esMovil && <div style={{ display:"flex", paddingBottom:8 }}>{nav}</div>}
      </header>

      {esMovil && menuAbierto && (
        <MenuLateral pestanias={pestanias} usuario={usuario} nombreDistrito={nombreDistrito}
          onCerrar={() => setMenuAbierto(false)} onSalir={salir} />
      )}

      <main style={{ maxWidth:1200, margin:"0 auto", padding: compacto ? "14px 12px" : "20px 16px" }}>
        {contenido}
      </main>
    </div>
  );

  return (
    <Routes>
      {/* La vista TV es para pantallas grandes: en teléfono no se ofrece y la URL vuelve a Audiencias */}
      <Route path="tv" element={esMovil ? <Navigate to="/panel/audiencias" replace /> :
        <VistaTV
          id_distrito={esAdmin ? undefined : usuario.id_distrito}
          nombreDistrito={esAdmin ? "Todos los distritos" : nombreDistrito(usuario.id_distrito)}
          onSalir={()=>navigate("/panel")}
        />
      } />
      {pestanias.map(({ ruta, Componente }) => (
        <Route key={ruta} path={ruta} element={layout(<Componente {...ctx} />)} />
      ))}
      {/* /panel, o una pestaña inexistente o sin permiso → Audiencias */}
      <Route path="*" element={<Navigate to="/panel/audiencias" replace />} />
    </Routes>
  );
}

// ─── MENÚ LATERAL (solo teléfono) ────────────────────────────────────────────
function MenuLateral({ pestanias, usuario, nombreDistrito, onCerrar, onSalir }) {
  const ref = useDialogo(onCerrar);

  // Mientras está abierto, la página de fondo no se desplaza
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, []);

  const enlace = ({ isActive }) => ({
    display:"flex", alignItems:"center", gap:12, padding:"13px 14px", borderRadius:8,
    background: isActive ? "rgba(255,255,255,.15)" : "transparent", color: isActive ? C.white : C.sky,
    fontSize:15, fontWeight:600, textDecoration:"none",
  });

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000 }}>
      <div ref={ref} id="menu-lateral" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Menú del panel" className="menu-lateral"
        style={{ position:"absolute", top:0, left:0, bottom:0, width:"min(80vw, 300px)", background:C.navy, color:C.white,
          display:"flex", flexDirection:"column", boxShadow:"4px 0 20px rgba(0,0,0,.3)", outline:"none", overflowY:"auto",
          paddingBottom:"env(safe-area-inset-bottom)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px 10px 16px", borderBottom:"1px solid rgba(168,212,240,.2)" }}>
          <LogoPoderJudicial alto={32} />
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:.3, flex:1 }}>SGPA</div>
          <button onClick={onCerrar} aria-label="Cerrar menú" title="Cerrar"
            style={{ background:"none", border:"none", color:C.sky, fontSize:28, lineHeight:1, cursor:"pointer", minWidth:40, minHeight:40 }}>×</button>
        </div>

        <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(168,212,240,.2)" }}>
          <div style={{ fontSize:14, fontWeight:700, overflowWrap:"anywhere" }}>{usuario.nombre}</div>
          <div style={{ fontSize:12, color:C.sky, marginTop:2 }}>{usuario.rol}{usuario.id_distrito ? ` · ${nombreDistrito(usuario.id_distrito)}` : ""}</div>
        </div>

        <nav aria-label="Secciones del panel" style={{ display:"flex", flexDirection:"column", gap:2, padding:10, flex:1 }}>
          {pestanias.map(p => (
            <NavLink key={p.ruta} to={`/panel/${p.ruta}`} onClick={onCerrar} style={enlace}>
              <span aria-hidden="true" style={{ width:22, textAlign:"center" }}>{p.icono}</span> {p.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:16, borderTop:"1px solid rgba(168,212,240,.2)" }}>
          <Btn onClick={onSalir} variant="ghost" style={{ width:"100%", color:C.sky, borderColor:"rgba(168,212,240,.4)", padding:"11px 14px" }}>Cerrar sesión</Btn>
        </div>
      </div>
    </div>
  );
}

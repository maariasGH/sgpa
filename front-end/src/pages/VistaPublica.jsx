import { useState } from "react";
import { C, FUENTE, ESTADOS, POR_PAGINA, TIPOS_AUDIENCIA } from "../theme";
import { hoy, sumarDias, fmtFecha, hhmm, abrevSala } from "../utils";
import { useCarga } from "../hooks/useCarga";
import * as sgpa from "../api/sgpa";
import { mensajeError } from "../api/client";
import Balanza from "../components/Balanza";
import DetalleAudiencia from "../components/DetalleAudiencia";
import { Btn, Card, Alert, EstadoBadge, FiltroSelect, Paginador, SelectorFecha, Vacio, Cargando } from "../components/ui";

const COLUMNAS = [
  { l:"Hora\nInicio", w:58 }, { l:"Hora\nFin", w:58 }, { l:"Sala", w:85 },
  { l:"Tribunal (Juez)", w:120 }, { l:"CUIJ", w:125 }, { l:"Carátula", w:null },
  { l:"Tipo Audiencia", w:125 }, { l:"Fiscal", w:120 }, { l:"Defensa", w:110 }, { l:"Estado", w:110 },
];

function Persona({ autoridad }) {
  if (!autoridad) return "–";
  return <><div style={{fontWeight:700,fontSize:13}}>{autoridad.apellido}</div><div style={{fontSize:11,color:C.muted}}>{autoridad.nombre}</div></>;
}

// ─── VISTA PÚBLICA (CU-01) ───────────────────────────────────────────────────
export default function VistaPublica({ onIrALogin }) {
  const [fecha, setFecha] = useState(hoy);
  const [filtros, setFiltros] = useState({ id_sala:"", tipo:"", estado:"", id_distrito:"" });
  const [pagina, setPagina] = useState(0);
  const [detalle, setDetalle] = useState(null);

  const cambiarFiltro = (k, v) => { setFiltros(f => ({ ...f, [k]: v })); setPagina(0); };
  const cambiarFecha  = (f) => { setFecha(f); setPagina(0); };
  const limpiar       = () => { setFiltros({ id_sala:"", tipo:"", estado:"", id_distrito:"" }); setPagina(0); };
  const hayFiltros    = Object.values(filtros).some(Boolean);

  const { datos: distritos } = useCarga(() => sgpa.listarDistritos(), [], []);
  const { datos: salas }     = useCarga(() => sgpa.listarSalas(), [], []);
  const { datos: resultado, error, cargando } = useCarga(
    () => sgpa.listarAudiencias({ fecha, ...filtros, page: pagina + 1, limit: POR_PAGINA }),
    [fecha, filtros, pagina],
  );

  const audiencias = resultado?.data ?? [];
  const total      = resultado?.total ?? 0;
  const totalPags  = resultado?.totalPages || 1;
  const salasFiltro = filtros.id_distrito ? salas.filter(s => String(s.id_distrito) === filtros.id_distrito) : salas;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FUENTE }}>
      {/* Header */}
      <header style={{ background:C.navy, color:C.white, padding:"0 24px" }}>
        <div style={{ padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Balanza size={36} />
            <div>
              <div style={{ fontWeight:700, fontSize:15, letterSpacing:.3 }}>Poder Judicial – Santa Fe</div>
              <div style={{ fontSize:11, color:C.sky, letterSpacing:.5 }}>SISTEMA DE GESTIÓN DE AUDIENCIAS</div>
            </div>
          </div>
          <Btn onClick={onIrALogin} variant="ghost" style={{ color:C.sky, borderColor:C.sky, fontSize:12 }}>Acceso Interno →</Btn>
        </div>
      </header>

      <main style={{ padding:"24px 32px" }}>
        {/* Título + fecha */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end", marginBottom:20 }}>
          <div style={{ flex:1, minWidth:200 }}>
            <h1 style={{ margin:"0 0 4px", fontSize:22, color:C.navy, fontWeight:800 }}>Calendario de Audiencias</h1>
            <p style={{ margin:0, fontSize:13, color:C.muted }}>Consulta pública — sin autenticación requerida</p>
          </div>
          <SelectorFecha fecha={fecha} onCambiar={cambiarFecha} hoy={hoy} sumarDias={sumarDias} />
        </div>

        {/* Filtros */}
        <Card style={{ padding:"14px 18px", marginBottom:16, display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.5 }}>Filtros</div>
          <FiltroSelect value={filtros.id_distrito} onChange={v=>{ cambiarFiltro("id_distrito", v); cambiarFiltro("id_sala", ""); }} minWidth={160}>
            <option value="">Todos los distritos</option>
            {distritos.map(d => <option key={d.id_distrito} value={String(d.id_distrito)}>{d.nombre}</option>)}
          </FiltroSelect>
          <FiltroSelect value={filtros.id_sala} onChange={v=>cambiarFiltro("id_sala", v)} minWidth={160}>
            <option value="">Todas las salas</option>
            {salasFiltro.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nombre}</option>)}
          </FiltroSelect>
          <FiltroSelect value={filtros.tipo} onChange={v=>cambiarFiltro("tipo", v)} minWidth={160}>
            <option value="">Todos los tipos</option>
            {TIPOS_AUDIENCIA.map(t => <option key={t} value={t}>{t}</option>)}
          </FiltroSelect>
          <FiltroSelect value={filtros.estado} onChange={v=>cambiarFiltro("estado", v)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g," ")}</option>)}
          </FiltroSelect>
          {hayFiltros && <Btn onClick={limpiar} variant="outline" size="sm">Limpiar</Btn>}
        </Card>

        {error && <Alert type="error">{mensajeError(error)}</Alert>}

        {/* Tabla */}
        <Card style={{ overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontWeight:700, color:C.navy, fontSize:14 }}>
              {fmtFecha(fecha)} — {total} audiencia{total!==1?"s":""}
              {total > POR_PAGINA && <span style={{fontWeight:400,color:C.muted,fontSize:12}}> · mostrando {pagina*POR_PAGINA+1}–{Math.min((pagina+1)*POR_PAGINA,total)}</span>}
            </span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{ fontSize:12, color:C.muted }}>Clic en fila para ver el detalle</span>
              <Paginador pagina={pagina} totalPags={totalPags} onCambiar={setPagina} compacto />
            </div>
          </div>

          {cargando && !audiencias.length ? <Cargando /> : audiencias.length === 0 ? (
            <Vacio titulo="Sin audiencias para esta fecha" subtitulo="Probá con otra fecha o limpiá los filtros" />
          ) : (
            <div style={{ overflowX:"auto", opacity: cargando ? .6 : 1 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {COLUMNAS.map(h => (
                      <th key={h.l} style={{
                        padding:"9px 10px", textAlign:"center", fontSize:11, fontWeight:700, color:C.white, letterSpacing:.2,
                        borderRight:"1px solid rgba(255,255,255,.15)", whiteSpace:"pre-line", lineHeight:1.2, verticalAlign:"bottom",
                        ...(h.w ? { width:h.w, minWidth:h.w } : { minWidth:180 }),
                      }}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audiencias.map((a, i) => {
                    const sel = detalle?.id_audiencia === a.id_audiencia;
                    const rowBg = sel ? "#DBEAFE" : i%2===0 ? C.white : "#F8FAFC";
                    const celda = { padding:"10px 10px", borderRight:`1px solid ${C.border}` };
                    return (
                      <tr key={a.id_audiencia} onClick={()=>setDetalle(sel ? null : a)}
                        style={{ background:rowBg, borderBottom:`1px solid ${C.border}`, cursor:"pointer", outline:sel?`2px solid ${C.blue}`:"none", outlineOffset:-1 }}
                        onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background="#EFF6FF"; }}
                        onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background=rowBg; }}>
                        <td style={{ ...celda, textAlign:"center", fontWeight:800, color:C.navy, fontSize:14, whiteSpace:"nowrap" }}>{hhmm(a.hora_inicio)}</td>
                        <td style={{ ...celda, textAlign:"center", color:C.muted, whiteSpace:"nowrap" }}>{hhmm(a.hora_fin)}</td>
                        <td style={{ ...celda, textAlign:"center" }}>
                          <div style={{fontWeight:800,fontSize:15,color:C.navy}}>{abrevSala(a.sala?.nombre)}</div>
                          <div style={{fontSize:10,color:C.muted,marginTop:1}}>{a.sala?.tipo ?? ""}</div>
                        </td>
                        <td style={{ ...celda, lineHeight:1.35 }}><Persona autoridad={a.juez} /></td>
                        <td style={{ ...celda, fontFamily:"monospace", fontSize:11, color:C.muted, lineHeight:1.7 }}>{a.cuij}</td>
                        <td style={{ ...celda, padding:"10px 12px", lineHeight:1.5, fontWeight:500 }}>{a.caratula}</td>
                        <td style={{ ...celda, fontSize:12, textAlign:"center", lineHeight:1.3 }}>{a.tipo_audiencia}</td>
                        <td style={{ ...celda, lineHeight:1.35 }}><Persona autoridad={a.fiscal} /></td>
                        <td style={{ ...celda, fontSize:12, color:C.muted }}>{a.defensor || <span style={{fontStyle:"italic",color:"#CBD5E0"}}>No designado</span>}</td>
                        <td style={{ padding:"10px 10px", textAlign:"center" }}><EstadoBadge estado={a.estado} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPags > 1 && (
            <div style={{padding:"12px 18px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#FAFCFF",flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:12,color:C.muted}}>Página {pagina+1} de {totalPags} · {total} audiencia{total!==1?"s":""}</span>
              <Paginador pagina={pagina} totalPags={totalPags} onCambiar={setPagina} />
            </div>
          )}
        </Card>
      </main>

      {detalle && (
        <DetalleAudiencia
          audiencia={detalle}
          onCerrar={()=>setDetalle(null)}
          pie={<>
            <span style={{ fontSize:12, color:C.muted }}>Vista pública — solo lectura</span>
            <Btn variant="outline" size="sm" onClick={()=>setDetalle(null)}>Cerrar</Btn>
          </>}
        />
      )}
    </div>
  );
}

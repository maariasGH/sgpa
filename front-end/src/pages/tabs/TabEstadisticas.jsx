import { useState } from "react";
import { C } from "../../theme";
import { fmtFecha, hoy, sumarDias } from "../../utils";
import { useCarga } from "../../hooks/useCarga";
import { useDebounce } from "../../hooks/useDebounce";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import { Alert, Btn, Card, Cargando, FiltroSelect } from "../../components/ui";

const RANGOS = { hoy:"Hoy", semana:"Últimos 7 días", mes:"Últimos 30 días", todo:"Histórico", personalizado:"Personalizado" };
const COLORES = ["#2B6CB0","#276749","#744210","#553C9A","#9B2C2C","#2C5282"];

const periodo = (rango) => {
  const h = hoy();
  if (rango === "hoy")    return { desde: h, hasta: h };
  if (rango === "semana") return { desde: sumarDias(h, -6), hasta: h };
  if (rango === "mes")    return { desde: sumarDias(h, -29), hasta: h };
  return { desde: "2000-01-01", hasta: "2099-12-31" };
};

// [{ ..., cantidad }] del backend → [[etiqueta, cantidad], ...] para los gráficos
const pares = (filas = [], etiqueta) => filas.map(f => [etiqueta(f), f.cantidad]);

// ─── GRÁFICOS ────────────────────────────────────────────────────────────────
function BarraHorizontal({ label, val, max, color=C.blue, total }) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:3, fontSize:12 }}>
        <span style={{ color:C.text, fontWeight:500, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
        <span style={{ color:C.muted, fontWeight:600, whiteSpace:"nowrap" }}>{val} {total ? <span style={{fontSize:10}}>({Math.round(val/total*100)}%)</span> : ""}</span>
      </div>
      <div style={{ height:10, background:"#EDF2F7", borderRadius:20, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:20, transition:"width .4s ease" }}/>
      </div>
    </div>
  );
}

function MiniDonut({ data, size=120 }) {
  const total = data.reduce((s, d) => s + d.val, 0);
  if (total === 0) return <div style={{width:size,height:size,borderRadius:"50%",background:"#EDF2F7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.muted}}>Sin datos</div>;
  const r = size / 2 - 8, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const visibles = data.filter(d => d.val > 0);
  const inicios = visibles.map((_, i) => visibles.slice(0, i).reduce((s, d) => s + d.val / total, 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Total ${total}`}>
      {visibles.map((d, i) => {
        const dash = (d.val / total) * circ;
        return (
          <circle key={d.label} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={size*0.13}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-inicios[i] * circ} />
        );
      })}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize={size*0.18} fontWeight="800" fill={C.navy}>{total}</text>
      <text x={cx} y={cy+size*0.16} textAnchor="middle" dominantBaseline="middle" fontSize={size*0.1} fill={C.muted}>total</text>
    </svg>
  );
}

function StatBox({ label, val, sub, color=C.navy, bg="#F7FAFC", icon="" }) {
  return (
    <Card style={{ padding:"14px 12px", background:bg, textAlign:"center", minWidth:0 }}>
      {icon && <div aria-hidden="true" style={{fontSize:22,marginBottom:4}}>{icon}</div>}
      <div style={{ fontSize:"clamp(24px, 7vw, 32px)", fontWeight:800, color, lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.4, marginTop:5 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>}
    </Card>
  );
}

function Panel({ titulo, children, ancho }) {
  return (
    <Card style={{ padding:"clamp(14px, 4vw, 20px) clamp(14px, 4vw, 24px)", minWidth:0, ...(ancho && { gridColumn:"1/-1" }) }}>
      <div style={{ fontWeight:700, color:C.navy, fontSize:14, marginBottom:16 }}>{titulo}</div>
      {children}
    </Card>
  );
}

const inputFecha = { padding:"6px 10px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:13 };

const SinDatos = () => <div style={{ color:C.muted, fontSize:13 }}>Sin datos</div>;

// ─── TAB ESTADÍSTICAS ────────────────────────────────────────────────────────
export default function TabEstadisticas({ usuario, esAdmin, distritos, nombreDistrito }) {
  const [rango, setRango] = useState("hoy");
  // Período elegido a mano (rango "personalizado"); arranca en los últimos 30 días
  const [manual, setManual] = useState(() => periodo("mes"));
  const [filtDist, setFiltDist] = useState("");
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const id_distrito = esAdmin ? filtDist : usuario.id_distrito;
  // Al tipear la fecha a mano cada dígito cambia el valor: se espera a que deje de cambiar
  const manualDemorado = useDebounce(manual, 400);
  const personalizado = rango === "personalizado";
  const { desde, hasta } = personalizado ? manualDemorado : periodo(rango);
  const errorPeriodo = !personalizado ? ""
    : !manual.desde || !manual.hasta ? "Completá las fechas Desde y Hasta."
    : manual.desde > manual.hasta ? "La fecha Desde no puede ser posterior a Hasta."
    : "";
  const periodoValido = !personalizado || (!errorPeriodo && desde && hasta && desde <= hasta);

  // Los conteos se hacen en la base (GET /audiencias/stats): no se descargan las audiencias
  const { datos: stats, error, cargando } = useCarga(
    () => (periodoValido ? sgpa.estadisticas({ desde, hasta, id_distrito }) : Promise.resolve(null)),
    [desde, hasta, id_distrito, periodoValido],
  );
  const { datos: usuarios } = useCarga(
    () => (esAdmin ? sgpa.listarTodosLosUsuarios() : Promise.resolve([])), [esAdmin], [],
  );

  const porEstado  = (e) => stats?.por_estado.find(r => r.estado === e)?.cantidad ?? 0;
  const total      = stats?.total ?? 0;
  const netas      = stats?.activas ?? 0;
  const enHorario  = porEstado("EN_HORARIO");
  const demoradas  = porEstado("DEMORADA");
  const realizadas = porEstado("REALIZADA");
  const canceladas = porEstado("CANCELADA");
  const suspendidas= porEstado("SUSPENDIDA");
  const reprog     = porEstado("REPROGRAMADA");
  const tasaCancelacion = total > 0 ? Math.round(canceladas / total * 100) : 0;

  const username = (id) => usuarios.find(u => u.id_usuario === id)?.username ?? `#${id}`;
  const porTipo     = pares(stats?.por_tipo, r => r.tipo_audiencia);
  const porSala     = pares(stats?.por_sala_activas, r => r.sala ?? `Sala ${r.id_sala}`).slice(0, 6);
  const porJuez     = pares(stats?.por_juez, r => r.juez ?? `Juez #${r.id_juez}`).slice(0, 5);
  const porOperador = esAdmin ? pares(stats?.por_operador, r => username(r.id_usuario).toUpperCase()) : [];
  const porDistrito = pares(stats?.por_distrito, r => nombreDistrito(r.id_distrito));
  const porHora     = pares(stats?.por_hora, r => String(r.hora).padStart(2, "0"));
  const maxHora = Math.max(...porHora.map(h => h[1]), 1);

  const donut = [
    { label:"En horario",    val:enHorario,   color:C.green },
    { label:"Demoradas",     val:demoradas,   color:"#D69E2E" },
    { label:"Realizadas",    val:realizadas,  color:"#3182CE" },
    { label:"Canceladas",    val:canceladas,  color:"#E53E3E" },
    { label:"Suspendidas",   val:suspendidas, color:"#DD6B20" },
    { label:"Reprogramadas", val:reprog,      color:"#6B46C1" },
  ];

  async function exportarExcel() {
    setExportando(true);
    setErrorExport("");
    try {
      const blob = await sgpa.exportarExcel({ desde, hasta, id_distrito });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `estadisticas-sgpa-${rango === "todo" ? "historico" : `${desde}_${hasta}`}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorExport(mensajeError(e));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: C.navy, fontWeight: 800, flex: "1 1 auto" }}>
        <span aria-hidden="true">📊</span> Estadísticas — {personalizado ? `${fmtFecha(manual.desde)} al ${fmtFecha(manual.hasta)}` : RANGOS[rango]}
      </h2>
      
      <div className="filtros" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, maxWidth: "100%" }}>
        {esAdmin && (
          <FiltroSelect etiqueta="Distrito" value={filtDist} onChange={setFiltDist} destacado>
            <option value="">Todos los distritos</option>
            {distritos.map(d => <option key={d.id_distrito} value={d.id_distrito}>{d.nombre}</option>)}
          </FiltroSelect>
        )}
        
        <div 
          role="group" 
          aria-label="Período" 
          className="filtro-ancho nav-scroll" 
          style={{ display: "flex", gap: 2, background: "#EDF2F7", borderRadius: 7, padding: 2, overflowX: "auto", maxWidth: "100%" }}
        >
          {Object.entries(RANGOS).map(([r, label]) => (
            <button 
              key={r} 
              type="button" 
              aria-pressed={rango === r} 
              onClick={() => setRango(r)} 
              style={{
                padding: "6px 12px", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flex: "0 0 auto",
                background: rango === r ? C.navy : "transparent", color: rango === r ? C.white : C.muted,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {personalizado && (
          <>
            <label style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
              Desde <input type="date" value={manual.desde} max={manual.hasta || undefined} onChange={e => setManual(m => ({ ...m, desde: e.target.value }))} style={inputFecha} />
            </label>
            <label style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
              Hasta <input type="date" value={manual.hasta} min={manual.desde || undefined} onChange={e => setManual(m => ({ ...m, hasta: e.target.value }))} style={inputFecha} />
            </label>
          </>
        )}

        <Btn variant="success" size="sm" onClick={exportarExcel} disabled={exportando || total === 0 || !periodoValido} style={{ flex: "0 0 auto" }}>
          {exportando ? "Generando…" : "⬇ Exportar Excel"}
        </Btn>
      </div>
    </div>

    {/* Resto del componente sin cambios ... */}

      {errorPeriodo && <Alert type="error">{errorPeriodo}</Alert>}
      {(error || errorExport) && <Alert type="error">{errorExport || mensajeError(error)}</Alert>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(130px,40%),1fr))",gap:10,marginBottom:20}}>
        <StatBox label="Total" val={total} bg="#EBF4FF" icon="📋"/>
        <StatBox label="Netas" val={netas} bg="#F0F4F8" icon="✅" sub={`${total>0?Math.round(netas/total*100):0}% del total`}/>
        <StatBox label="En horario" val={enHorario} color={C.green} bg={C.greenBg} icon="🟢"/>
        <StatBox label="Demoradas" val={demoradas} color={C.yellow} bg={C.yellowBg} icon="🟡"/>
        <StatBox label="Realizadas" val={realizadas} color="#2C5282" bg="#EBF8FF" icon="🔵"/>
        <StatBox label="Canceladas" val={canceladas} color={C.red} bg={C.redBg} icon="🔴" sub={`${tasaCancelacion}% tasa`}/>
        <StatBox label="Suspendidas" val={suspendidas} color={C.orange} bg={C.orangeBg} icon="🟠"/>
        <StatBox label="Reprogramadas" val={reprog} color="#553C9A" bg="#FAF5FF" icon="🔄"/>
      </div>

      {cargando && !total ? <Card><Cargando /></Card> : total === 0 ? (
        <Card style={{padding:48,textAlign:"center",color:C.muted}}>
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontWeight:600}}>Sin datos para el período seleccionado</div>
        </Card>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(340px,100%),1fr))",gap:16}}>
          <Panel titulo="Distribución por estado">
            <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",justifyContent:"center"}}>
              <MiniDonut size={130} data={donut}/>
              <div style={{flex:"1 1 180px"}}>
                {donut.map(({label,val,color}) => (
                  <div key={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:color,flexShrink:0}}/>
                    <span style={{fontSize:12,flex:1,color:C.text}}>{label}</span>
                    <span style={{fontSize:12,fontWeight:700,color}}>{val}</span>
                    <span style={{fontSize:11,color:C.muted,minWidth:32,textAlign:"right"}}>{total>0?Math.round(val/total*100):0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel titulo="Por tipo de audiencia">
            {porTipo.length === 0 ? <SinDatos/> : porTipo.map(([tipo, val], i) => (
              <BarraHorizontal key={tipo} label={tipo} val={val} max={porTipo[0][1]} total={total} color={COLORES[i % COLORES.length]}/>
            ))}
          </Panel>

          <Panel titulo="Uso de salas (audiencias activas)">
            {porSala.length === 0 ? <SinDatos/> : porSala.map(([sala, val]) => (
              <BarraHorizontal key={sala} label={sala} val={val} max={porSala[0][1]} total={netas} color={C.blue}/>
            ))}
          </Panel>

          <Panel titulo="Carga por juez (top 5)">
            {porJuez.length === 0 ? <SinDatos/> : porJuez.map(([juez, val]) => (
              <BarraHorizontal key={juez} label={juez} val={val} max={porJuez[0][1]} color="#553C9A"/>
            ))}
          </Panel>

          <Panel titulo="Distribución horaria">
            {porHora.length === 0 ? <SinDatos/> : (
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80}}>
                {porHora.map(([hora, val]) => (
                  <div key={hora} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{fontSize:9,color:C.muted}}>{val}</div>
                    <div style={{width:"100%",background:C.blue,borderRadius:"3px 3px 0 0",height:`${(val/maxHora)*64}px`,minHeight:4}}/>
                    <div style={{fontSize:9,color:C.muted,whiteSpace:"nowrap"}}>{hora}h</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {esAdmin && (
            <Panel titulo="Audiencias por operador">
              {porOperador.length === 0 ? <SinDatos/> : porOperador.map(([op, val]) => (
                <BarraHorizontal key={op} label={op} val={val} max={porOperador[0][1]} total={total} color={C.green}/>
              ))}
            </Panel>
          )}

          {esAdmin && !filtDist && porDistrito.length > 0 && (
            <Panel titulo="Audiencias por distrito" ancho>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(180px,100%),1fr))",gap:12}}>
                {porDistrito.map(([nombre, val], i) => (
                  <div key={nombre} style={{background:"#F7FAFC",border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
                    <div style={{fontSize:28,fontWeight:800,color:COLORES[i % COLORES.length]}}>{val}</div>
                    <div style={{fontSize:12,color:C.muted,fontWeight:600,marginTop:2}}>{nombre}</div>
                    <div style={{fontSize:11,color:C.muted}}>{Math.round(val/total*100)}% del total</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

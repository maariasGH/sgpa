import { useState } from "react";
import { C, ESTADOS_INACTIVOS } from "../../theme";
import { hoy, sumarDias, nombreAutoridad } from "../../utils";
import { useCarga } from "../../hooks/useCarga";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import { Alert, Btn, Card, Cargando, FiltroSelect } from "../../components/ui";

const RANGOS = { hoy:"Hoy", semana:"Últimos 7 días", mes:"Últimos 30 días", todo:"Histórico" };
const COLORES = ["#2B6CB0","#276749","#744210","#553C9A","#9B2C2C","#2C5282"];

const periodo = (rango) => {
  const h = hoy();
  if (rango === "hoy")    return { desde: h, hasta: h };
  if (rango === "semana") return { desde: sumarDias(h, -6), hasta: h };
  if (rango === "mes")    return { desde: sumarDias(h, -29), hasta: h };
  return { desde: "2000-01-01", hasta: "2099-12-31" };
};

// Cuenta ocurrencias por clave y devuelve [[clave, cantidad], ...] ordenado desc
const contar = (lista, clave) => Object.entries(
  lista.reduce((acc, x) => { const k = clave(x); acc[k] = (acc[k] || 0) + 1; return acc; }, {})
).sort((a, b) => b[1] - a[1]);

// ─── GRÁFICOS ────────────────────────────────────────────────────────────────
function BarraHorizontal({ label, val, max, color=C.blue, total }) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:12 }}>
        <span style={{ color:C.text, fontWeight:500 }}>{label}</span>
        <span style={{ color:C.muted, fontWeight:600 }}>{val} {total ? <span style={{fontSize:10}}>({Math.round(val/total*100)}%)</span> : ""}</span>
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
    <Card style={{ padding:"16px 18px", background:bg, textAlign:"center" }}>
      {icon && <div style={{fontSize:22,marginBottom:4}}>{icon}</div>}
      <div style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.4, marginTop:5 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>}
    </Card>
  );
}

function Panel({ titulo, children, ancho }) {
  return (
    <Card style={{ padding:"20px 24px", ...(ancho && { gridColumn:"1/-1" }) }}>
      <div style={{ fontWeight:700, color:C.navy, fontSize:14, marginBottom:16 }}>{titulo}</div>
      {children}
    </Card>
  );
}

const SinDatos = () => <div style={{ color:C.muted, fontSize:13 }}>Sin datos</div>;

// ─── TAB ESTADÍSTICAS ────────────────────────────────────────────────────────
export default function TabEstadisticas({ usuario, esAdmin, distritos, nombreDistrito }) {
  const [rango, setRango] = useState("hoy");
  const [filtDist, setFiltDist] = useState("");
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const id_distrito = esAdmin ? filtDist : usuario.id_distrito;
  const { desde, hasta } = periodo(rango);

  const { datos: aud, error, cargando } = useCarga(
    () => sgpa.listarTodasLasAudiencias(rango === "todo" ? { id_distrito } : { desde, hasta, id_distrito }),
    [rango, id_distrito], [],
  );
  const { datos: usuarios } = useCarga(
    () => (esAdmin ? sgpa.listarUsuarios().then(r => r.data) : Promise.resolve([])), [esAdmin], [],
  );

  const porEstado  = (e) => aud.filter(a => a.estado === e).length;
  const total      = aud.length;
  const enHorario  = porEstado("EN_HORARIO");
  const demoradas  = porEstado("DEMORADA");
  const realizadas = porEstado("REALIZADA");
  const canceladas = porEstado("CANCELADA");
  const suspendidas= porEstado("SUSPENDIDA");
  const reprog     = porEstado("REPROGRAMADA");
  const netas      = total - canceladas - suspendidas;
  const tasaCancelacion = total > 0 ? Math.round(canceladas / total * 100) : 0;

  const activas = aud.filter(a => !ESTADOS_INACTIVOS.includes(a.estado));
  const porTipo = contar(aud, a => a.tipo_audiencia);
  const porSala = contar(activas, a => a.sala?.nombre ?? "Sin sala").slice(0, 6);
  const porJuez = contar(activas, a => nombreAutoridad(a.juez)).slice(0, 5);
  const porOperador = esAdmin
    ? contar(aud, a => (usuarios.find(u => u.id_usuario === a.id_usuario_carga)?.username ?? `#${a.id_usuario_carga}`).toUpperCase())
    : [];
  const porDistrito = contar(aud, a => nombreDistrito(a.sala?.id_distrito));
  const porHora = contar(activas, a => String(a.hora_inicio).slice(0, 2)).sort((a, b) => a[0].localeCompare(b[0]));
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
      <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:18,color:C.navy,fontWeight:800,flex:1}}>📊 Estadísticas — {RANGOS[rango]}</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {esAdmin && (
            <FiltroSelect value={filtDist} onChange={setFiltDist} destacado>
              <option value="">Todos los distritos</option>
              {distritos.map(d => <option key={d.id_distrito} value={d.id_distrito}>{d.nombre}</option>)}
            </FiltroSelect>
          )}
          <div style={{display:"flex",gap:2,background:"#EDF2F7",borderRadius:7,padding:2}}>
            {Object.entries(RANGOS).map(([r, label]) => (
              <button key={r} onClick={()=>setRango(r)} style={{
                padding:"5px 12px",border:"none",borderRadius:5,fontSize:12,fontWeight:600,cursor:"pointer",
                background:rango===r?C.navy:"transparent",color:rango===r?C.white:C.muted,
              }}>{label}</button>
            ))}
          </div>
          <Btn variant="success" size="sm" onClick={exportarExcel} disabled={exportando || total === 0}>
            {exportando ? "Generando…" : "⬇ Exportar Excel"}
          </Btn>
        </div>
      </div>

      {(error || errorExport) && <Alert type="error">{errorExport || mensajeError(error)}</Alert>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20}}>
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:16}}>
          <Panel titulo="Distribución por estado">
            <div style={{display:"flex",alignItems:"center",gap:24}}>
              <MiniDonut size={130} data={donut}/>
              <div style={{flex:1}}>
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
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
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

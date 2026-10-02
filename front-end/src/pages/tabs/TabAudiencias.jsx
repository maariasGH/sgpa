import { useState } from "react";
import { C, ESTADOS, ESTADOS_FINALES, TIPOS_AUDIENCIA } from "../../theme";
import { hoy, sumarDias, fmtFecha, hhmm, formatearCuij } from "../../utils";
import { useCarga } from "../../hooks/useCarga";
import { validarAudiencia } from "../../validaciones";
import { activable, noPropagar } from "../../a11y";
import { useEsMovil } from "../../hooks/useEsMovil";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import DetalleAudiencia from "../../components/DetalleAudiencia";
import {
  Alert, Btn, Card, Cargando, DatoMovil, EstadoBadge, FiltroSelect, Input, ItemMovil, Label, Modal, Select,
  SelectorFecha, TextArea, Th, Vacio,
} from "../../components/ui";

// Estados que se pueden elegir al editar (CANCELADA/SUSPENDIDA van por su propio modal con motivo)
const ESTADOS_EDITABLES = ["EN_HORARIO", "DEMORADA", "REALIZADA", "REPROGRAMADA"];

// ─── TAB AUDIENCIAS ──────────────────────────────────────────────────────────
export default function TabAudiencias({ usuario, esAdmin, distritos, salas, nombreDistrito }) {
  const [fecha, setFecha] = useState(hoy);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [modal, setModal] = useState(null); // "nueva" | "editar" | "cancelar"
  const [objetivo, setObjetivo] = useState(null);
  const [exito, setExito] = useState("");
  const esMovil = useEsMovil();

  const id_distrito = esAdmin ? filtroDistrito : usuario.id_distrito;

  // Al abrir la pestaña, las audiencias cuyo horario de fin ya pasó y siguen
  // EN_HORARIO / DEMORADA pasan a REALIZADA. El listado espera a que termine
  // para no mostrar estados viejos; si falla, se lista igual.
  const [finalizacion] = useState(() => sgpa.finalizarVencidas().catch(() => null));
  const { datos: finalizadas } = useCarga(() => finalizacion.then(r => r?.total ?? 0), [], 0);

  const { datos: audiencias, error, cargando, recargar } = useCarga(
    () => finalizacion.then(() => sgpa.listarTodasLasAudiencias({ fecha, estado: filtroEstado, id_distrito })),
    [fecha, filtroEstado, id_distrito], [],
  );
  // Autoridades (activas e inactivas: al editar se conserva la asignada aunque esté inactiva)
  const { datos: autoridades } = useCarga(() => sgpa.listarTodasLasAutoridades(), [], []);
  // Nombre del operador que cargó cada audiencia (solo el Admin puede listar usuarios)
  const { datos: usuarios } = useCarga(
    () => (esAdmin ? sgpa.listarTodosLosUsuarios() : Promise.resolve([])), [esAdmin], [],
  );
  const usernameDe = (id) => usuarios.find(u => u.id_usuario === id)?.username ?? `#${id}`;

  const mostrarExito = (msg) => { setExito(msg); setTimeout(() => setExito(""), 3000); };
  const cerrarModal = () => { setModal(null); setObjetivo(null); };
  const abrir = (tipo, a = null) => { setObjetivo(a); setModal(tipo); setDetalle(null); };

  const puedeModificar = (a) => !ESTADOS_FINALES.includes(a.estado);

  const filasExtra = (a) => [
    ...(esAdmin ? [["Operador", usernameDe(a.id_usuario_carga).toUpperCase()]] : []),
    ...(esAdmin ? [["Distrito", nombreDistrito(a.sala?.id_distrito)]] : []),
  ];

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, color:C.navy, fontWeight:800, flex:1, minWidth:180 }}>Gestión de audiencias</h2>
        <Btn onClick={()=>abrir("nueva")} style={esMovil ? { width:"100%", padding:"11px 18px" } : {}}>+ Nueva audiencia</Btn>
      </div>

      {exito && <Alert type="success">{exito}</Alert>}
      {finalizadas > 0 && (
        <Alert type="info">
          {finalizadas === 1
            ? "1 audiencia con el horario de fin vencido pasó a REALIZADA."
            : `${finalizadas} audiencias con el horario de fin vencido pasaron a REALIZADA.`}
        </Alert>
      )}
      {error && <Alert type="error">{mensajeError(error)}</Alert>}

      {/* Filtros */}
      <Card style={{ padding: esMovil ? 12 : "12px 16px", marginBottom:14 }}>
      <div className="filtros">
        <SelectorFecha fecha={fecha} onCambiar={setFecha} hoy={hoy} sumarDias={sumarDias} />
        {esAdmin && (
          <FiltroSelect etiqueta="Distrito" value={filtroDistrito} onChange={setFiltroDistrito} destacado>
            <option value="">Todos los distritos</option>
            {distritos.map(d => <option key={d.id_distrito} value={d.id_distrito}>{d.nombre}</option>)}
          </FiltroSelect>
        )}
        <FiltroSelect etiqueta="Estado" value={filtroEstado} onChange={setFiltroEstado}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g," ")}</option>)}
        </FiltroSelect>
        {(filtroEstado || filtroDistrito) && <Btn size="sm" variant="outline" style={esMovil ? { width:"100%", padding:"9px 12px" } : {}} onClick={()=>{ setFiltroEstado(""); setFiltroDistrito(""); }}>Limpiar filtros</Btn>}
      </div>
      </Card>

      <Card style={{ overflow:"hidden" }}>
        <div style={{ padding: esMovil ? "10px 14px" : "12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
          <span>
            {fmtFecha(fecha)} — {audiencias.length} audiencia{audiencias.length!==1?"s":""}
            {esAdmin && (filtroDistrito ? ` · ${nombreDistrito(Number(filtroDistrito))}` : " · Todos los distritos")}
          </span>
          {!esMovil && <span style={{fontSize:11,color:C.muted}}>Clic o Enter en una fila para ver el detalle</span>}
        </div>
        {cargando && !audiencias.length ? <Cargando /> : audiencias.length === 0 ? (
          <Vacio titulo="Sin audiencias para esta fecha" />
        ) : esMovil ? (
          <div style={{ opacity: cargando ? .6 : 1 }}>
            {audiencias.map(a => (
              <ItemMovil key={a.id_audiencia} onClick={()=>setDetalle(a)} seleccionado={detalle?.id_audiencia === a.id_audiencia}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ minWidth:0 }}>
                    <span style={{ fontWeight:800, color:C.navy, fontSize:15 }}>{hhmm(a.hora_inicio)}</span>
                    <span style={{ color:C.muted, fontSize:12 }}> – {hhmm(a.hora_fin)} · {a.sala?.nombre ?? "–"}</span>
                  </div>
                  <EstadoBadge estado={a.estado} />
                </div>
                <div style={{ fontWeight:600, fontSize:14, lineHeight:1.35, marginBottom:4 }}>{a.caratula}</div>
                <div style={{ fontSize:12, color:C.muted }}>
                  {a.tipo_audiencia} · <span style={{ fontFamily:"monospace" }}>{a.cuij}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
                  <DatoMovil label="Juez">{a.juez ? `${a.juez.apellido}, ${a.juez.nombre}` : "–"}</DatoMovil>
                  {esAdmin
                    ? <DatoMovil label="Distrito · Operador">{nombreDistrito(a.sala?.id_distrito)} · {usernameDe(a.id_usuario_carga).toUpperCase()}</DatoMovil>
                    : <DatoMovil label="Fiscal">{a.fiscal ? `${a.fiscal.apellido}, ${a.fiscal.nombre}` : "–"}</DatoMovil>}
                </div>
                {puedeModificar(a) && (
                  <div style={{ display:"flex", gap:8, marginTop:10 }} {...noPropagar}>
                    <Btn size="sm" variant="outline" style={{ flex:1, padding:"8px 10px" }} onClick={()=>abrir("editar", a)}>✏️ Editar</Btn>
                    <Btn size="sm" variant="outline" style={{ flex:1, padding:"8px 10px", color:C.red, borderColor:C.red }} onClick={()=>abrir("cancelar", a)}>⛔ Cancelar/Susp.</Btn>
                  </div>
                )}
              </ItemMovil>
            ))}
          </div>
        ) : (
          <div style={{ overflowX:"auto", opacity: cargando ? .6 : 1 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F7FAFC" }}>
                  {["Horario","CUIJ","Carátula","Tipo",...(esAdmin?["Distrito"]:[]),"Sala","Juez",...(esAdmin?["Operador"]:[]),"Estado"].map(h => <Th key={h}>{h}</Th>)}<Th><span className="solo-lector">Acciones</span></Th>
                </tr>
              </thead>
              <tbody>
                {audiencias.map((a, i) => {
                  const sel = detalle?.id_audiencia === a.id_audiencia;
                  const rowBg = sel ? "#DBEAFE" : i%2===0 ? C.white : "#FAFCFF";
                  const td = { padding:"9px 10px" };
                  const ver = () => setDetalle(sel ? null : a);
                  return (
                    <tr key={a.id_audiencia} {...activable(ver)} style={{ background:rowBg, borderBottom:`1px solid ${C.border}`, ...(sel && { outline:`2px solid ${C.blue}`, outlineOffset:-1 }) }}
                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background="#EFF6FF"; }}
                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background=rowBg; }}>
                      <td style={{ ...td, fontWeight:700, color:C.navy, whiteSpace:"nowrap" }}>
                        {hhmm(a.hora_inicio)}<span style={{fontWeight:400,color:C.muted,fontSize:11}}> – {hhmm(a.hora_fin)}</span>
                      </td>
                      <td style={{ ...td, fontFamily:"monospace", fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{a.cuij}</td>
                      <td style={{ ...td, lineHeight:1.4, minWidth:160 }}>{a.caratula}</td>
                      <td style={{ ...td, fontSize:12, whiteSpace:"nowrap" }}>{a.tipo_audiencia}</td>
                      {esAdmin && <td style={{ ...td, fontSize:12, whiteSpace:"nowrap", color:C.blue, fontWeight:600 }}>{nombreDistrito(a.sala?.id_distrito)}</td>}
                      <td style={{ ...td, fontSize:12, whiteSpace:"nowrap" }}>{a.sala?.nombre ?? "–"}</td>
                      <td style={{ ...td, fontSize:12, minWidth:110 }}>
                        {a.juez ? <><div style={{fontWeight:600,whiteSpace:"nowrap"}}>{a.juez.apellido}</div><div style={{fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{a.juez.nombre}</div></> : "–"}
                      </td>
                      {esAdmin && <td style={{ ...td, textAlign:"center", fontWeight:700, letterSpacing:.5 }}>{usernameDe(a.id_usuario_carga).toUpperCase()}</td>}
                      <td style={td}><EstadoBadge estado={a.estado} /></td>
                      <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }} {...noPropagar}>
                        {puedeModificar(a) && (
                          <div style={{ display:"flex", gap:4 }}>
                            <Btn size="sm" variant="outline" title={`Modificar audiencia ${a.cuij}`} onClick={()=>abrir("editar", a)}>✏️</Btn>
                            <Btn size="sm" variant="outline" title={`Cancelar o suspender audiencia ${a.cuij}`} style={{color:C.red,borderColor:C.red}} onClick={()=>abrir("cancelar", a)}>⛔</Btn>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detalle && (
        <DetalleAudiencia
          audiencia={detalle}
          onCerrar={()=>setDetalle(null)}
          filasExtra={filasExtra(detalle)}
          pie={<>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {puedeModificar(detalle) && <>
                <Btn size="sm" variant="outline" onClick={()=>abrir("editar", detalle)}>✏️ Editar</Btn>
                <Btn size="sm" variant="outline" style={{color:C.red,borderColor:C.red}} onClick={()=>abrir("cancelar", detalle)}>⛔ Cancelar/Suspender</Btn>
              </>}
            </div>
            <Btn variant="outline" size="sm" onClick={()=>setDetalle(null)}>Cerrar</Btn>
          </>}
        />
      )}

      {(modal === "nueva" || modal === "editar") && (
        <ModalAudiencia
          audiencia={objetivo}
          salas={esAdmin && filtroDistrito ? salas.filter(s => s.id_distrito === Number(filtroDistrito)) : salas}
          autoridades={autoridades}
          fechaInicial={fecha}
          onClose={cerrarModal}
          onGuardado={(msg) => { cerrarModal(); mostrarExito(msg); recargar(); }}
        />
      )}

      {modal === "cancelar" && objetivo && (
        <ModalCancelarSuspender
          audiencia={objetivo}
          onClose={cerrarModal}
          onGuardado={(msg) => { cerrarModal(); mostrarExito(msg); recargar(); }}
        />
      )}
    </div>
  );
}

// ─── MODAL ALTA / MODIFICACIÓN ───────────────────────────────────────────────
function ModalAudiencia({ audiencia, salas, autoridades, fechaInicial, onClose, onGuardado }) {
  const esNueva = !audiencia;
  const [form, setForm] = useState(() => audiencia ? {
    cuij: audiencia.cuij, caratula: audiencia.caratula, tipo_audiencia: audiencia.tipo_audiencia,
    id_sala: String(audiencia.id_sala), id_juez: String(audiencia.id_juez), id_fiscal: String(audiencia.id_fiscal),
    defensor: audiencia.defensor ?? "", fecha: audiencia.fecha,
    hora_inicio: hhmm(audiencia.hora_inicio), hora_fin: hhmm(audiencia.hora_fin), estado: audiencia.estado,
  } : {
    cuij:"", caratula:"", tipo_audiencia:"", id_sala:"", id_juez:"", id_fiscal:"", defensor:"",
    fecha: fechaInicial, hora_inicio:"", hora_fin:"", estado:"EN_HORARIO",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Jueces y fiscales del distrito de la sala elegida; activos, más el ya asignado
  const sala = salas.find(s => s.id_sala === Number(form.id_sala));
  const opcionesAutoridad = (cargo, actual) => autoridades
    .filter(a => a.cargo === cargo && (!sala || a.id_distrito === sala.id_distrito))
    .filter(a => a.estado || a.id_autoridad === Number(actual))
    .map(a => ({ value: String(a.id_autoridad), label: `${a.apellido}, ${a.nombre}${a.estado ? "" : " (inactiva)"}` }));

  const cambiarSala = (v) => {
    const nueva = salas.find(s => s.id_sala === Number(v));
    const delDistrito = (id) => autoridades.find(a => a.id_autoridad === Number(id))?.id_distrito === nueva?.id_distrito;
    setForm(f => ({
      ...f, id_sala: v,
      id_juez:   delDistrito(f.id_juez)   ? f.id_juez   : "",
      id_fiscal: delDistrito(f.id_fiscal) ? f.id_fiscal : "",
    }));
  };

  const tipos = TIPOS_AUDIENCIA.includes(form.tipo_audiencia) || !form.tipo_audiencia
    ? TIPOS_AUDIENCIA : [...TIPOS_AUDIENCIA, form.tipo_audiencia];

  async function guardar() {
    const err = validarAudiencia(form);
    if (err) { setError(err); return; }
    setError("");
    setGuardando(true);

    const datos = {
      cuij: form.cuij, caratula: form.caratula.trim(), tipo_audiencia: form.tipo_audiencia,
      id_sala: Number(form.id_sala), id_juez: Number(form.id_juez), id_fiscal: Number(form.id_fiscal),
      defensor: form.defensor.trim() || null, fecha: form.fecha,
      hora_inicio: form.hora_inicio, hora_fin: form.hora_fin,
    };
    try {
      if (esNueva) {
        await sgpa.crearAudiencia(datos);
        onGuardado("Audiencia programada correctamente.");
      } else {
        await sgpa.modificarAudiencia(audiencia.id_audiencia, datos);
        if (form.estado !== audiencia.estado) {
          await sgpa.cambiarEstado(audiencia.id_audiencia, form.estado);
        }
        onGuardado("Audiencia actualizada correctamente.");
      }
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title={esNueva ? "Nueva audiencia" : "Modificar audiencia"} onClose={onClose} width={640}>
      {error && <Alert type="error">{error}</Alert>}
      <div className="form-grid">
        <div style={{ gridColumn:"1/-1", display:"flex", flexDirection:"column", gap:4 }}>
          <Label required htmlFor="campo-cuij">CUIJ</Label>
          <input id="campo-cuij" aria-describedby="ayuda-cuij" required value={form.cuij} onChange={e=>set("cuij", formatearCuij(e.target.value))}
            placeholder="21-06017630-9" maxLength={13} inputMode="numeric"
            style={{ padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:14, color:C.text, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"monospace", letterSpacing:.5 }} />
          <div id="ayuda-cuij" style={{ fontSize:11, color:C.muted }}>Formato: XX-XXXXXXXX-X — los guiones se agregan automáticamente</div>
        </div>
        <Input label="Carátula" value={form.caratula} onChange={v=>set("caratula", v)} required placeholder="Apellido, Nombre s/Delito" style={{ gridColumn:"1/-1" }} />
        <Select label="Tipo de audiencia" value={form.tipo_audiencia} onChange={v=>set("tipo_audiencia", v)} required options={tipos.map(t => ({ value:t, label:t }))} />
        <Select label="Sala" value={form.id_sala} onChange={cambiarSala} required options={salas.filter(s => s.activa || s.id_sala === Number(form.id_sala)).map(s => ({ value:String(s.id_sala), label:s.nombre }))} />
        <Input label="Fecha" type="date" value={form.fecha} onChange={v=>set("fecha", v)} required />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Input label="Hora inicio" type="time" value={form.hora_inicio} onChange={v=>set("hora_inicio", v)} required />
          <Input label="Hora fin" type="time" value={form.hora_fin} onChange={v=>set("hora_fin", v)} required />
        </div>
        <Select label="Juez" value={form.id_juez} onChange={v=>set("id_juez", v)} required disabled={!sala}
          placeholder={sala ? "— Seleccionar —" : "— Elegí primero la sala —"} options={opcionesAutoridad("JUEZ", form.id_juez)} />
        <Select label="Fiscal" value={form.id_fiscal} onChange={v=>set("id_fiscal", v)} required disabled={!sala}
          placeholder={sala ? "— Seleccionar —" : "— Elegí primero la sala —"} options={opcionesAutoridad("FISCAL", form.id_fiscal)} />
        <Input label="Defensor (opcional)" value={form.defensor} onChange={v=>set("defensor", v)} placeholder="Dr./Dra. Apellido, Nombre" style={{ gridColumn:"1/-1" }} />
        {!esNueva && (
          <Select label="Estado" value={form.estado} onChange={v=>set("estado", v)} placeholder={null}
            options={ESTADOS_EDITABLES.map(e => ({ value:e, label:e.replace(/_/g," ") }))} />
        )}
      </div>
      <div className="acciones-modal" style={{ marginTop:20 }}>
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : esNueva ? "Programar audiencia" : "Guardar cambios"}</Btn>
      </div>
    </Modal>
  );
}

// ─── MODAL CANCELAR / SUSPENDER ──────────────────────────────────────────────
function ModalCancelarSuspender({ audiencia, onClose, onGuardado }) {
  const [accion, setAccion] = useState("CANCELADA");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) { setError("El motivo es obligatorio."); return; }
    setGuardando(true);
    try {
      await sgpa.cambiarEstado(audiencia.id_audiencia, accion, motivo.trim());
      onGuardado(`Audiencia ${accion.toLowerCase()} correctamente.`);
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title="Cancelar / Suspender audiencia" onClose={onClose} width={460}>
      <Alert type="error">Esta acción cambiará el estado de la audiencia y liberará la sala, el juez y el fiscal. El registro se conserva para trazabilidad.</Alert>
      <div style={{ marginBottom:12, fontSize:13, color:C.text }}><strong>Carátula:</strong> {audiencia.caratula}</div>
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        {["CANCELADA","SUSPENDIDA"].map(a => (
          <button key={a} type="button" aria-pressed={accion===a} onClick={()=>setAccion(a)} style={{
            flex:1, padding:10, border:`2px solid ${accion===a?C.red:C.border}`, borderRadius:6,
            background:accion===a?C.redBg:C.white, color:accion===a?C.red:C.muted, fontWeight:700, cursor:"pointer", fontSize:13,
          }}>{a}</button>
        ))}
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{ marginBottom:16 }}>
        <TextArea label="Motivo" required value={motivo} onChange={v=>{ setMotivo(v); if (error) setError(""); }} error={!!error}
          placeholder="Describir el motivo de cancelación o suspensión..." />
      </div>
      <div className="acciones-modal">
        <Btn variant="outline" onClick={onClose}>Volver</Btn>
        <Btn variant="danger" onClick={confirmar} disabled={guardando}>Confirmar {accion.toLowerCase()}</Btn>
      </div>
    </Modal>
  );
}

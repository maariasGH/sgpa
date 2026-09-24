import { useState } from "react";
import { C, ESTADOS, ESTADOS_FINALES, TIPOS_AUDIENCIA } from "../../theme";
import { hoy, sumarDias, fmtFecha, hhmm, formatearCuij } from "../../utils";
import { useCarga } from "../../hooks/useCarga";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import DetalleAudiencia from "../../components/DetalleAudiencia";
import {
  Alert, Btn, Card, Cargando, EstadoBadge, FiltroSelect, Input, Label, Modal, Select,
  SelectorFecha, TextArea, Th, Vacio,
} from "../../components/ui";

// Estados que se pueden elegir al editar (CANCELADA/SUSPENDIDA van por su propio modal con motivo)
const ESTADOS_EDITABLES = ["EN_HORARIO", "DEMORADA", "REALIZADA", "REPROGRAMADA"];

const aMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

// Validaciones rápidas del lado del cliente (el backend vuelve a validar todo)
const validarForm = (f) => {
  const faltan = [];
  if (!f.cuij) faltan.push("CUIJ");
  if (!f.caratula.trim()) faltan.push("carátula");
  if (!f.tipo_audiencia) faltan.push("tipo");
  if (!f.id_sala) faltan.push("sala");
  if (!f.fecha) faltan.push("fecha");
  if (!f.hora_inicio) faltan.push("hora de inicio");
  if (!f.hora_fin) faltan.push("hora de fin");
  if (!f.id_juez) faltan.push("juez");
  if (!f.id_fiscal) faltan.push("fiscal");
  if (faltan.length) return `Completá: ${faltan.join(", ")}.`;
  if (!/^\d{2}-\d{8}-\d$/.test(f.cuij)) return "El CUIJ debe tener formato XX-XXXXXXXX-X.";
  if (aMin(f.hora_inicio) < aMin("07:00") || aMin(f.hora_inicio) > aMin("19:00")) return "La hora de inicio debe estar entre las 07:00 y las 19:00 hs.";
  if (aMin(f.hora_fin) > aMin("19:00")) return "La hora de fin no puede superar las 19:00 hs.";
  if (aMin(f.hora_fin) <= aMin(f.hora_inicio)) return "La hora de fin debe ser posterior a la de inicio.";
  return null;
};

// ─── TAB AUDIENCIAS ──────────────────────────────────────────────────────────
export default function TabAudiencias({ usuario, esAdmin, distritos, salas, nombreDistrito }) {
  const [fecha, setFecha] = useState(hoy);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [modal, setModal] = useState(null); // "nueva" | "editar" | "cancelar"
  const [objetivo, setObjetivo] = useState(null);
  const [exito, setExito] = useState("");

  const id_distrito = esAdmin ? filtroDistrito : usuario.id_distrito;

  const { datos: audiencias, error, cargando, recargar } = useCarga(
    () => sgpa.listarTodasLasAudiencias({ fecha, estado: filtroEstado, id_distrito }),
    [fecha, filtroEstado, id_distrito], [],
  );
  // Autoridades (activas e inactivas: al editar se conserva la asignada aunque esté inactiva)
  const { datos: autoridades } = useCarga(() => sgpa.listarAutoridades().then(r => r.data), [], []);
  // Nombre del operador que cargó cada audiencia (solo el Admin puede listar usuarios)
  const { datos: usuarios } = useCarga(
    () => (esAdmin ? sgpa.listarUsuarios().then(r => r.data) : Promise.resolve([])), [esAdmin], [],
  );
  const usernameDe = (id) => usuarios.find(u => u.id_usuario === id)?.username ?? (id === 0 ? "debug" : `#${id}`);

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
        <h2 style={{ margin:0, fontSize:18, color:C.navy, fontWeight:800, flex:1 }}>Gestión de audiencias</h2>
        <Btn onClick={()=>abrir("nueva")}>+ Nueva audiencia</Btn>
      </div>

      {exito && <Alert type="success">{exito}</Alert>}
      {error && <Alert type="error">{mensajeError(error)}</Alert>}

      {/* Filtros */}
      <Card style={{ padding:"12px 16px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
        <SelectorFecha fecha={fecha} onCambiar={setFecha} hoy={hoy} sumarDias={sumarDias} />
        {esAdmin && (
          <FiltroSelect value={filtroDistrito} onChange={setFiltroDistrito} destacado>
            <option value="">Todos los distritos</option>
            {distritos.map(d => <option key={d.id_distrito} value={d.id_distrito}>{d.nombre}</option>)}
          </FiltroSelect>
        )}
        <FiltroSelect value={filtroEstado} onChange={setFiltroEstado}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g," ")}</option>)}
        </FiltroSelect>
        {(filtroEstado || filtroDistrito) && <Btn size="sm" variant="outline" onClick={()=>{ setFiltroEstado(""); setFiltroDistrito(""); }}>Limpiar filtros</Btn>}
      </Card>

      <Card style={{ overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>
            {fmtFecha(fecha)} — {audiencias.length} audiencia{audiencias.length!==1?"s":""}
            {esAdmin && (filtroDistrito ? ` · ${nombreDistrito(Number(filtroDistrito))}` : " · Todos los distritos")}
          </span>
          <span style={{fontSize:11,color:C.muted}}>Clic en fila para ver detalle</span>
        </div>
        {cargando && !audiencias.length ? <Cargando /> : audiencias.length === 0 ? (
          <Vacio titulo="Sin audiencias para esta fecha" />
        ) : (
          <div style={{ overflowX:"auto", opacity: cargando ? .6 : 1 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F7FAFC" }}>
                  {["Horario","CUIJ","Carátula","Tipo",...(esAdmin?["Distrito"]:[]),"Sala","Juez",...(esAdmin?["Operador"]:[]),"Estado",""].map(h => <Th key={h}>{h}</Th>)}
                </tr>
              </thead>
              <tbody>
                {audiencias.map((a, i) => {
                  const sel = detalle?.id_audiencia === a.id_audiencia;
                  const rowBg = sel ? "#DBEAFE" : i%2===0 ? C.white : "#FAFCFF";
                  const td = { padding:"9px 10px", cursor:"pointer" };
                  const ver = () => setDetalle(sel ? null : a);
                  return (
                    <tr key={a.id_audiencia} style={{ background:rowBg, borderBottom:`1px solid ${C.border}`, outline:sel?`2px solid ${C.blue}`:"none", outlineOffset:-1 }}
                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background="#EFF6FF"; }}
                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background=rowBg; }}>
                      <td onClick={ver} style={{ ...td, fontWeight:700, color:C.navy, whiteSpace:"nowrap" }}>
                        {hhmm(a.hora_inicio)}<span style={{fontWeight:400,color:C.muted,fontSize:11}}> – {hhmm(a.hora_fin)}</span>
                      </td>
                      <td onClick={ver} style={{ ...td, fontFamily:"monospace", fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{a.cuij}</td>
                      <td onClick={ver} style={{ ...td, lineHeight:1.4, minWidth:160 }}>{a.caratula}</td>
                      <td onClick={ver} style={{ ...td, fontSize:12, whiteSpace:"nowrap" }}>{a.tipo_audiencia}</td>
                      {esAdmin && <td onClick={ver} style={{ ...td, fontSize:12, whiteSpace:"nowrap", color:C.blue, fontWeight:600 }}>{nombreDistrito(a.sala?.id_distrito)}</td>}
                      <td onClick={ver} style={{ ...td, fontSize:12, whiteSpace:"nowrap" }}>{a.sala?.nombre ?? "–"}</td>
                      <td onClick={ver} style={{ ...td, fontSize:12, minWidth:110 }}>
                        {a.juez ? <><div style={{fontWeight:600,whiteSpace:"nowrap"}}>{a.juez.apellido}</div><div style={{fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{a.juez.nombre}</div></> : "–"}
                      </td>
                      {esAdmin && <td onClick={ver} style={{ ...td, textAlign:"center", fontWeight:700, letterSpacing:.5 }}>{usernameDe(a.id_usuario_carga).toUpperCase()}</td>}
                      <td onClick={ver} style={td}><EstadoBadge estado={a.estado} /></td>
                      <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>
                        {puedeModificar(a) && (
                          <div style={{ display:"flex", gap:4 }}>
                            <Btn size="sm" variant="outline" title="Modificar" onClick={()=>abrir("editar", a)}>✏️</Btn>
                            <Btn size="sm" variant="outline" title="Cancelar / Suspender" style={{color:C.red,borderColor:C.red}} onClick={()=>abrir("cancelar", a)}>⛔</Btn>
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
            <div style={{ display:"flex", gap:8 }}>
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
    const err = validarForm(form);
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
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={{ gridColumn:"1/-1", display:"flex", flexDirection:"column", gap:4 }}>
          <Label required>CUIJ</Label>
          <input value={form.cuij} onChange={e=>set("cuij", formatearCuij(e.target.value))}
            placeholder="21-06017630-9" maxLength={13}
            style={{ padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:14, color:C.text, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"monospace", letterSpacing:.5 }} />
          <div style={{ fontSize:11, color:C.muted }}>Formato: XX-XXXXXXXX-X — los guiones se agregan automáticamente</div>
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
      <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
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
          <button key={a} onClick={()=>setAccion(a)} style={{
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
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="outline" onClick={onClose}>Volver</Btn>
        <Btn variant="danger" onClick={confirmar} disabled={guardando}>Confirmar {accion.toLowerCase()}</Btn>
      </div>
    </Modal>
  );
}

import { useState } from "react";
import { C } from "../../theme";
import { useCarga } from "../../hooks/useCarga";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import { ActivoBadge, Alert, Btn, Card, Cargando, FiltroSelect, Input, Modal, Select, TextArea, Th, Vacio } from "../../components/ui";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── TAB AUTORIDADES ─────────────────────────────────────────────────────────
export default function TabAutoridades({ usuario, esAdmin, distritos, nombreDistrito }) {
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("true");
  const [filtroDistrito, setFiltroDistrito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // "form" | "baja"
  const [objetivo, setObjetivo] = useState(null);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");

  const { datos, error: errorCarga, cargando, recargar } = useCarga(
    () => sgpa.listarAutoridades({ cargo: filtroCargo, estado: filtroEstado, id_distrito: filtroDistrito, q: busqueda.trim() }),
    [filtroCargo, filtroEstado, filtroDistrito, busqueda],
  );
  const lista = datos?.data ?? [];

  const mostrarExito = (msg) => { setExito(msg); setError(""); setTimeout(() => setExito(""), 3000); };
  const cerrar = () => { setModal(null); setObjetivo(null); };

  async function reactivar(a) {
    try {
      await sgpa.altaAutoridad(a.id_autoridad);
      mostrarExito("Autoridad reactivada.");
      recargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, color:C.navy, fontWeight:800, flex:1 }}>Gestión de autoridades</h2>
        <Btn onClick={()=>{ setObjetivo(null); setModal("form"); }}>+ Nueva autoridad</Btn>
      </div>
      {exito && <Alert type="success">{exito}</Alert>}
      {(error || errorCarga) && <Alert type="error">{error || mensajeError(errorCarga)}</Alert>}

      <Card style={{ padding:"12px 16px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:10 }}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o DNI…"
          style={{ padding:"6px 10px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:13, minWidth:200 }} />
        <FiltroSelect value={filtroCargo} onChange={setFiltroCargo}>
          <option value="">Todos los cargos</option>
          <option value="JUEZ">Juez/a</option>
          <option value="FISCAL">Fiscal</option>
        </FiltroSelect>
        <FiltroSelect value={filtroEstado} onChange={setFiltroEstado}>
          <option value="true">Solo activas</option>
          <option value="false">Solo inactivas</option>
          <option value="">Todas</option>
        </FiltroSelect>
        {esAdmin && (
          <FiltroSelect value={filtroDistrito} onChange={setFiltroDistrito} destacado>
            <option value="">Todos los distritos</option>
            {distritos.map(d => <option key={d.id_distrito} value={d.id_distrito}>{d.nombre}</option>)}
          </FiltroSelect>
        )}
      </Card>

      <Card style={{ overflow:"hidden" }}>
        {cargando && !lista.length ? <Cargando /> : lista.length === 0 ? (
          <Vacio icono="⚖️" titulo="No hay autoridades para los filtros elegidos" />
        ) : (
          <div style={{ overflowX:"auto", opacity: cargando ? .6 : 1 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F7FAFC" }}>
                  {["Apellido y nombre","DNI","Cargo","Distrito","Email","Teléfono","Estado","Acciones"].map(h => <Th key={h}>{h}</Th>)}
                </tr>
              </thead>
              <tbody>
                {lista.map((a, i) => (
                  <tr key={a.id_autoridad} style={{ background:i%2===0?C.white:"#FAFCFF", borderBottom:`1px solid ${C.border}`, opacity:a.estado?1:.55 }}>
                    <td style={{ padding:"9px 12px", fontWeight:600 }}>{a.apellido}, {a.nombre}</td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:12 }}>{a.dni}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ background:a.cargo==="JUEZ"?"#EBF8FF":"#FAF5FF", color:a.cargo==="JUEZ"?"#2C5282":"#553C9A", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>{a.cargo}</span>
                    </td>
                    <td style={{ padding:"9px 12px", fontSize:12 }}>{nombreDistrito(a.id_distrito)}</td>
                    <td style={{ padding:"9px 12px", fontSize:12, color:C.muted }}>{a.email}</td>
                    <td style={{ padding:"9px 12px", fontSize:12, color:C.muted }}>{a.telefono || "–"}</td>
                    <td style={{ padding:"9px 12px" }}><ActivoBadge activo={a.estado} /></td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", gap:4 }}>
                        <Btn size="sm" variant="outline" title="Modificar" onClick={()=>{ setObjetivo(a); setModal("form"); }}>✏️</Btn>
                        <Btn size="sm" variant="outline" style={{ color:a.estado?C.red:C.green, borderColor:a.estado?C.red:C.green }}
                          onClick={()=> a.estado ? (setObjetivo(a), setModal("baja")) : reactivar(a)}>
                          {a.estado ? "↓ Baja" : "↑ Reactivar"}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal === "form" && (
        <ModalAutoridad autoridad={objetivo} distritos={distritos} usuario={usuario} esAdmin={esAdmin}
          onClose={cerrar} onGuardado={(msg)=>{ cerrar(); mostrarExito(msg); recargar(); }} />
      )}
      {modal === "baja" && objetivo && (
        <ModalBajaAutoridad autoridad={objetivo}
          onClose={cerrar} onGuardado={()=>{ cerrar(); mostrarExito("Autoridad dada de baja lógica."); recargar(); }} />
      )}
    </div>
  );
}

// ─── MODAL BAJA ──────────────────────────────────────────────────────────────
function ModalBajaAutoridad({ autoridad, onClose, onGuardado }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) { setError("El motivo es obligatorio."); return; }
    setGuardando(true);
    try {
      await sgpa.bajaAutoridad(autoridad.id_autoridad, motivo.trim());
      onGuardado();
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title="Dar de baja autoridad" onClose={onClose} width={460}>
      <Alert type="error">
        Esta es una <strong>baja lógica</strong>: la autoridad quedará INACTIVA pero sus datos se conservan.
        No podrá ser asignada a nuevas audiencias. No se permite si tiene audiencias activas futuras.
      </Alert>
      <div style={{ background:"#F7FAFC", border:`1px solid ${C.border}`, borderRadius:7, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{autoridad.cargo}: {autoridad.apellido}, {autoridad.nombre}</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>DNI: {autoridad.dni} | Email: {autoridad.email}</div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{ marginBottom:16 }}>
        <TextArea label="Motivo de la baja" required value={motivo} onChange={v=>{ setMotivo(v); if (error) setError(""); }}
          error={!!error} placeholder="Ej: Jubilación, traslado de distrito, renuncia..." />
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" onClick={confirmar} disabled={guardando}>Confirmar baja</Btn>
      </div>
    </Modal>
  );
}

// ─── MODAL ALTA / MODIFICACIÓN ───────────────────────────────────────────────
function ModalAutoridad({ autoridad, distritos, usuario, esAdmin, onClose, onGuardado }) {
  const esNueva = !autoridad;
  const [form, setForm] = useState(() => autoridad ? {
    nombre: autoridad.nombre, apellido: autoridad.apellido, dni: String(autoridad.dni), cargo: autoridad.cargo,
    email: autoridad.email, telefono: autoridad.telefono ?? "", id_distrito: String(autoridad.id_distrito),
  } : {
    nombre:"", apellido:"", dni:"", cargo:"JUEZ", email:"", telefono:"",
    id_distrito: esAdmin ? "" : String(usuario.id_distrito),
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni || !form.email || !form.cargo || !form.id_distrito) {
      setError("Completá todos los campos obligatorios."); return;
    }
    if (!/^\d+$/.test(form.dni)) { setError("El DNI debe contener solo números."); return; }
    if (!EMAIL_REGEX.test(form.email)) { setError("El email no tiene un formato válido."); return; }
    setError("");
    setGuardando(true);

    const datos = {
      nombre: form.nombre.trim(), apellido: form.apellido.trim(), dni: Number(form.dni), cargo: form.cargo,
      email: form.email.trim(), telefono: form.telefono.trim() || null, id_distrito: Number(form.id_distrito),
    };
    try {
      if (esNueva) await sgpa.crearAutoridad(datos);
      else await sgpa.modificarAutoridad(autoridad.id_autoridad, datos);
      onGuardado(esNueva ? "Autoridad registrada correctamente." : "Autoridad actualizada correctamente.");
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title={esNueva ? "Nueva autoridad" : "Modificar autoridad"} onClose={onClose}>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Input label="Nombre" value={form.nombre} onChange={v=>set("nombre", v)} required />
        <Input label="Apellido" value={form.apellido} onChange={v=>set("apellido", v)} required />
        <Input label="DNI" value={form.dni} onChange={v=>set("dni", v.replace(/\D/g, ""))} required placeholder="ej: 28441201" />
        <Select label="Cargo" value={form.cargo} onChange={v=>set("cargo", v)} required placeholder={null}
          options={[{ value:"JUEZ", label:"Juez/a" }, { value:"FISCAL", label:"Fiscal" }]} />
        <Input label="Email" type="email" value={form.email} onChange={v=>set("email", v)} required placeholder="nombre@justsf.gov.ar" style={{ gridColumn:"1/-1" }} />
        <Input label="Teléfono (opcional)" value={form.telefono} onChange={v=>set("telefono", v)} placeholder="ej: 0342-4521100" maxLength={20} />
        <Select label="Distrito" value={form.id_distrito} onChange={v=>set("id_distrito", v)} required disabled={!esAdmin}
          options={distritos.map(d => ({ value:String(d.id_distrito), label:d.nombre }))} />
      </div>
      <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={guardando}>{esNueva ? "Registrar autoridad" : "Guardar cambios"}</Btn>
      </div>
    </Modal>
  );
}

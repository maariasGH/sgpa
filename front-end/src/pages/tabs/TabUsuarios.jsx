import { useState } from "react";
import { C } from "../../theme";
import { useCarga } from "../../hooks/useCarga";
import { useEsMovil } from "../../hooks/useEsMovil";
import { validarOperador } from "../../validaciones";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import { ActivoBadge, Alert, Btn, Card, Cargando, DatoMovil, Input, ItemMovil, Modal, Select, TextArea, Th, Vacio } from "../../components/ui";

// ─── TAB OPERADORES (solo Administrador) ─────────────────────────────────────
export default function TabUsuarios({ distritos, nombreDistrito }) {
  const [modal, setModal] = useState(false);
  const [bajaDe, setBajaDe] = useState(null); // operador a dar de baja (pide motivo)
  const [objetivo, setObjetivo] = useState(null);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");
  const esMovil = useEsMovil();

  const { datos, error: errorCarga, cargando, recargar } = useCarga(() => sgpa.listarTodosLosUsuarios({ rol: "OPERADOR" }), []);
  const operadores = datos ?? [];

  const mostrarExito = (msg) => { setExito(msg); setError(""); setTimeout(() => setExito(""), 3000); };

  // La baja pide motivo en un modal; la reactivación es directa
  async function cambiarEstado(u) {
    if (u.estado) { setBajaDe(u); return; }
    try {
      await sgpa.altaOperador(u.id_usuario);
      mostrarExito("Operador reactivado. Se le envió un email avisándole.");
      recargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, color:C.navy, fontWeight:800, flex:1 }}>Operadores</h2>
        <Btn onClick={()=>{ setObjetivo(null); setModal(true); }} style={esMovil ? { width:"100%", padding:"11px 18px" } : {}}>+ Nuevo operador</Btn>
      </div>
      {exito && <Alert type="success">{exito}</Alert>}
      {(error || errorCarga) && <Alert type="error">{error || mensajeError(errorCarga)}</Alert>}

      <Card style={{ overflow:"hidden" }}>
        {cargando && !operadores.length ? <Cargando /> : operadores.length === 0 ? (
          <Vacio icono="👤" titulo="Todavía no hay operadores" subtitulo="Creá el primero con “+ Nuevo operador”" />
        ) : esMovil ? (
          <div>
            {operadores.map(u => (
              <ItemMovil key={u.id_usuario} apagado={!u.estado}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:"monospace", fontWeight:700, color:C.navy, fontSize:14 }}>{u.username}</div>
                    <div style={{ fontSize:13 }}>{u.nombre}</div>
                  </div>
                  <ActivoBadge activo={u.estado} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <DatoMovil label="DNI"><span style={{ fontFamily:"monospace" }}>{u.dni}</span></DatoMovil>
                  <DatoMovil label="Distrito">{nombreDistrito(u.id_distrito)}</DatoMovil>
                  <div style={{ gridColumn:"1/-1" }}><DatoMovil label="Email">{u.email}</DatoMovil></div>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <Btn size="sm" variant="outline" style={{ flex:1, padding:"8px 10px" }} onClick={()=>{ setObjetivo(u); setModal(true); }}>✏️ Editar</Btn>
                  <Btn size="sm" variant="outline" style={{ flex:1, padding:"8px 10px", color:u.estado?C.red:C.green, borderColor:u.estado?C.red:C.green }} onClick={()=>cambiarEstado(u)}>
                    {u.estado ? "↓ Baja" : "↑ Alta"}
                  </Btn>
                </div>
              </ItemMovil>
            ))}
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F7FAFC" }}>
                  {["Usuario","Nombre completo","DNI","Email","Distrito","Estado","Acciones"].map(h => <Th key={h}>{h}</Th>)}
                </tr>
              </thead>
              <tbody>
                {operadores.map((u, i) => (
                  <tr key={u.id_usuario} style={{ background:i%2===0?C.white:"#FAFCFF", borderBottom:`1px solid ${C.border}`, opacity:u.estado?1:.55 }}>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontWeight:600, color:C.navy }}>{u.username}</td>
                    <td style={{ padding:"9px 12px" }}>{u.nombre}</td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:12 }}>{u.dni}</td>
                    <td style={{ padding:"9px 12px", fontSize:12, color:C.muted }}>{u.email}</td>
                    <td style={{ padding:"9px 12px", fontSize:12 }}>{nombreDistrito(u.id_distrito)}</td>
                    <td style={{ padding:"9px 12px" }}><ActivoBadge activo={u.estado} /></td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", gap:4 }}>
                        <Btn size="sm" variant="outline" title={`Modificar operador ${u.username}`} onClick={()=>{ setObjetivo(u); setModal(true); }}>✏️</Btn>
                        <Btn size="sm" variant="outline" style={{ color:u.estado?C.red:C.green, borderColor:u.estado?C.red:C.green }} onClick={()=>cambiarEstado(u)}>
                          {u.estado ? "↓ Baja" : "↑ Alta"}
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

      {modal && (
        <ModalOperador operador={objetivo} distritos={distritos}
          onClose={()=>{ setModal(false); setObjetivo(null); }}
          onGuardado={(msg)=>{ setModal(false); setObjetivo(null); mostrarExito(msg); recargar(); }} />
      )}
      {bajaDe && (
        <ModalBajaOperador operador={bajaDe} nombreDistrito={nombreDistrito}
          onClose={()=>setBajaDe(null)}
          onGuardado={()=>{ setBajaDe(null); mostrarExito("Operador dado de baja. Se le envió un email con el motivo."); recargar(); }} />
      )}
    </div>
  );
}

// ─── MODAL BAJA ──────────────────────────────────────────────────────────────
function ModalBajaOperador({ operador, nombreDistrito, onClose, onGuardado }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) { setError("El motivo es obligatorio."); return; }
    setGuardando(true);
    try {
      await sgpa.bajaOperador(operador.id_usuario, motivo.trim());
      onGuardado();
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title="Dar de baja operador" onClose={onClose} width={460}>
      <Alert type="error">
        Esta es una <strong>baja lógica</strong>: el operador quedará INACTIVO y no podrá iniciar sesión,
        pero sus datos se conservan. Se le enviará un email a <strong>{operador.email}</strong> con el motivo.
      </Alert>
      <div style={{ background:"#F7FAFC", border:`1px solid ${C.border}`, borderRadius:7, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{operador.nombre} ({operador.username})</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>DNI: {operador.dni} | Distrito: {nombreDistrito(operador.id_distrito)}</div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{ marginBottom:16 }}>
        <TextArea label="Motivo de la baja" required value={motivo} onChange={v=>{ setMotivo(v); if (error) setError(""); }}
          error={!!error} placeholder="Ej: Renuncia, traslado, licencia prolongada..." />
      </div>
      <div className="acciones-modal">
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" onClick={confirmar} disabled={guardando}>Confirmar baja</Btn>
      </div>
    </Modal>
  );
}

function ModalOperador({ operador, distritos, onClose, onGuardado }) {
  const esNuevo = !operador;
  const [form, setForm] = useState(() => operador ? {
    username: operador.username, password: "", nombre: operador.nombre, dni: String(operador.dni),
    email: operador.email, id_distrito: String(operador.id_distrito ?? ""),
  } : { username:"", password:"", nombre:"", dni:"", email:"", id_distrito:"" });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    const err = validarOperador(form, esNuevo);
    if (err) { setError(err); return; }
    setError("");
    setGuardando(true);

    const datos = {
      username: form.username.trim(), nombre: form.nombre.trim(), dni: Number(form.dni),
      email: form.email.trim(), id_distrito: Number(form.id_distrito),
      ...(form.password && { password: form.password }),
    };
    try {
      if (esNuevo) await sgpa.crearOperador(datos);
      else await sgpa.modificarOperador(operador.id_usuario, datos);
      onGuardado(esNuevo ? "Operador creado. Se le envió un email de bienvenida." : "Operador actualizado correctamente.");
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title={esNuevo ? "Nuevo operador" : "Modificar operador"} onClose={onClose}>
      {error && <Alert type="error">{error}</Alert>}
      <div className="form-grid">
        <Input label="Nombre de usuario" value={form.username} onChange={v=>set("username", v)} required placeholder="ej: op.venado" autoComplete="off" />
        <Input label={esNuevo ? "Contraseña" : "Nueva contraseña (opcional)"} type="password" value={form.password}
          onChange={v=>set("password", v)} required={esNuevo} ayuda="Mínimo 8 caracteres" autoComplete="new-password" />
        <Input label="Nombre completo" value={form.nombre} onChange={v=>set("nombre", v)} required style={{ gridColumn:"1/-1" }} />
        <Input label="DNI" value={form.dni} onChange={v=>set("dni", v.replace(/\D/g, ""))} required placeholder="ej: 30445678" inputMode="numeric" />
        <Input label="Email" type="email" value={form.email} onChange={v=>set("email", v)} required placeholder="nombre@justsf.gov.ar" />
        <Select label="Distrito asignado" value={form.id_distrito} onChange={v=>set("id_distrito", v)} required
          options={distritos.map(d => ({ value:String(d.id_distrito), label:d.nombre }))} />
      </div>
      <div className="acciones-modal" style={{ marginTop:20 }}>
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={guardando}>{esNuevo ? "Crear operador" : "Guardar cambios"}</Btn>
      </div>
    </Modal>
  );
}

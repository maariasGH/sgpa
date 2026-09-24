import { useState } from "react";
import { C } from "../../theme";
import { useCarga } from "../../hooks/useCarga";
import * as sgpa from "../../api/sgpa";
import { mensajeError } from "../../api/client";
import { ActivoBadge, Alert, Btn, Card, Cargando, Input, Modal, Select, Th, Vacio } from "../../components/ui";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── TAB OPERADORES (solo Administrador) ─────────────────────────────────────
export default function TabUsuarios({ distritos, nombreDistrito }) {
  const [modal, setModal] = useState(false);
  const [objetivo, setObjetivo] = useState(null);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");

  const { datos, error: errorCarga, cargando, recargar } = useCarga(() => sgpa.listarUsuarios({ rol: "OPERADOR" }), []);
  const operadores = datos?.data ?? [];

  const mostrarExito = (msg) => { setExito(msg); setError(""); setTimeout(() => setExito(""), 3000); };

  async function cambiarEstado(u) {
    try {
      if (u.estado) await sgpa.bajaOperador(u.id_usuario);
      else await sgpa.altaOperador(u.id_usuario);
      mostrarExito(`Operador ${u.estado ? "dado de baja" : "reactivado"} correctamente.`);
      recargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <div>
      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, color:C.navy, fontWeight:800, flex:1 }}>Operadores</h2>
        <Btn onClick={()=>{ setObjetivo(null); setModal(true); }}>+ Nuevo operador</Btn>
      </div>
      {exito && <Alert type="success">{exito}</Alert>}
      {(error || errorCarga) && <Alert type="error">{error || mensajeError(errorCarga)}</Alert>}

      <Card style={{ overflow:"hidden" }}>
        {cargando && !operadores.length ? <Cargando /> : operadores.length === 0 ? (
          <Vacio icono="👤" titulo="Todavía no hay operadores" subtitulo="Creá el primero con “+ Nuevo operador”" />
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
                        <Btn size="sm" variant="outline" title="Modificar" onClick={()=>{ setObjetivo(u); setModal(true); }}>✏️</Btn>
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
    </div>
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
    if (!form.username || !form.nombre.trim() || !form.dni || !form.email || !form.id_distrito || (esNuevo && !form.password)) {
      setError("Completá todos los campos obligatorios."); return;
    }
    if (form.password && form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (!EMAIL_REGEX.test(form.email)) { setError("Email inválido."); return; }
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
      onGuardado(esNuevo ? "Operador creado correctamente." : "Operador actualizado correctamente.");
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <Modal title={esNuevo ? "Nuevo operador" : "Modificar operador"} onClose={onClose}>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Input label="Nombre de usuario" value={form.username} onChange={v=>set("username", v)} required placeholder="ej: op.venado" />
        <Input label={esNuevo ? "Contraseña" : "Nueva contraseña (opcional)"} type="password" value={form.password}
          onChange={v=>set("password", v)} required={esNuevo} ayuda="Mínimo 8 caracteres" />
        <Input label="Nombre completo" value={form.nombre} onChange={v=>set("nombre", v)} required style={{ gridColumn:"1/-1" }} />
        <Input label="DNI" value={form.dni} onChange={v=>set("dni", v.replace(/\D/g, ""))} required placeholder="ej: 30445678" />
        <Input label="Email" type="email" value={form.email} onChange={v=>set("email", v)} required placeholder="nombre@justsf.gov.ar" />
        <Select label="Distrito asignado" value={form.id_distrito} onChange={v=>set("id_distrito", v)} required
          options={distritos.map(d => ({ value:String(d.id_distrito), label:d.nombre }))} />
      </div>
      <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={guardando}>{esNuevo ? "Crear operador" : "Guardar cambios"}</Btn>
      </div>
    </Modal>
  );
}

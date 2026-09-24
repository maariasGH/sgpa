import { useState } from "react";
import { C, FUENTE } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { mensajeError } from "../api/client";
import Balanza from "../components/Balanza";
import { Alert, Btn, Card, Input } from "../components/ui";

// ─── LOGIN (CU-08) ───────────────────────────────────────────────────────────
export default function Login({ onVolver, onIngresado }) {
  const { iniciarSesion } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) { setError("Ingresá usuario y contraseña."); return; }
    setEnviando(true);
    setError("");
    try {
      await iniciarSesion(username.trim(), password);
      onIngresado();
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FUENTE, padding:16 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><Balanza size={56} radius={12} /></div>
          <div style={{ color:C.white, fontWeight:800, fontSize:20 }}>Poder Judicial – Santa Fe</div>
          <div style={{ color:C.sky, fontSize:12, letterSpacing:1, textTransform:"uppercase", marginTop:4 }}>Sistema de Gestión de Audiencias</div>
        </div>
        <Card style={{ padding:28 }}>
          <h2 style={{ margin:"0 0 20px", fontSize:17, color:C.navy, textAlign:"center", fontWeight:700 }}>Acceso interno</h2>
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Usuario" value={username} onChange={setUsername} placeholder="ej: admin" />
            <Input label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <Btn type="submit" variant="primary" size="lg" style={{ width:"100%", marginTop:4 }} disabled={enviando}>
              {enviando ? "Ingresando…" : "Iniciar sesión"}
            </Btn>
          </form>
          {import.meta.env.DEV && (
            <div style={{ marginTop:20, padding:"12px 0 0", borderTop:`1px solid ${C.border}`, textAlign:"center", fontSize:11, color:C.muted }}>
              Desarrollo: <strong>admin</strong> / admin1234
            </div>
          )}
          <button onClick={onVolver} style={{ width:"100%", marginTop:16, padding:8, background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, color:C.muted, cursor:"pointer" }}>
            ← Volver a la vista pública
          </button>
        </Card>
      </div>
    </div>
  );
}

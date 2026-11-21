import { useState } from "react";
import { useNavigate } from "react-router";
import { C, FUENTE } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { mensajeError } from "../api/client";
import * as sgpa from "../api/sgpa";
import Balanza from "../components/Balanza";
import { Alert, Btn, Card, Input } from "../components/ui";

export default function CambiarPassword() {
  const { usuario, completarCambioPassword, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    setEnviando(true);
    try {
      const sesion = await sgpa.cambiarPasswordInicial(password);
      completarCambioPassword(sesion);
      navigate("/panel", { replace: true });
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  async function salir() {
    await cerrarSesion();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FUENTE, padding:16 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><Balanza size={56} radius={12} /></div>
          <div style={{ color:C.white, fontWeight:800, fontSize:20 }}>Poder Judicial – Santa Fe</div>
          <div style={{ color:C.sky, fontSize:12, letterSpacing:1, textTransform:"uppercase", marginTop:4 }}>Sistema de Gestión de Audiencias</div>
        </div>
        <Card style={{ padding:28 }}>
          <h1 style={{ margin:"0 0 8px", fontSize:18, color:C.navy, textAlign:"center", fontWeight:700 }}>Elegí una contraseña nueva</h1>
          <p style={{ margin:"0 0 20px", color:C.muted, fontSize:13, textAlign:"center" }}>
            Hola {usuario.nombre}. Para continuar, reemplazá la contraseña temporal por una propia.
          </p>
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Nueva contraseña" type="password" value={password} onChange={setPassword}
              placeholder="Al menos 8 caracteres" autoComplete="new-password" />
            <Input label="Repetir contraseña" type="password" value={confirmacion} onChange={setConfirmacion}
              placeholder="Ingresala nuevamente" autoComplete="new-password" />
            <Btn type="submit" variant="primary" size="lg" style={{ width:"100%", marginTop:4 }} disabled={enviando}>
              {enviando ? "Guardando…" : "Cambiar contraseña"}
            </Btn>
          </form>
          <Btn onClick={salir} variant="outline" style={{ width:"100%", marginTop:12 }}>Cerrar sesión</Btn>
        </Card>
      </div>
    </div>
  );
}

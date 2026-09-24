import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { setToken, onSesionExpirada } from "../api/client";
import * as sgpa from "../api/sgpa";

// El JWT dura 5 minutos: se renueva automáticamente un minuto antes
const RENOVAR_CADA_MS = 4 * 60 * 1000;

// Sesión en memoria: al recargar la página hay que volver a iniciar sesión
// (el token no se guarda en localStorage por seguridad).
export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null); // { token, usuario }

  const cerrarSesion = useCallback(async ({ avisarServidor = true } = {}) => {
    if (avisarServidor) await sgpa.logout().catch(() => {});
    setToken(null);
    setSesion(null);
  }, []);

  const iniciarSesion = useCallback(async (username, password) => {
    const { token, usuario } = await sgpa.login(username, password);
    setToken(token);
    setSesion({ token, usuario });
    return usuario;
  }, []);

  // Si la API responde 401 (token vencido) se cierra la sesión local
  useEffect(() => {
    onSesionExpirada(() => {
      setToken(null);
      setSesion(null);
    });
  }, []);

  // Renovación periódica del token mientras haya sesión
  useEffect(() => {
    if (!sesion) return undefined;
    const t = setInterval(async () => {
      try {
        const { token } = await sgpa.refresh();
        setToken(token);
      } catch {
        cerrarSesion({ avisarServidor: false });
      }
    }, RENOVAR_CADA_MS);
    return () => clearInterval(t);
  }, [sesion, cerrarSesion]);

  const valor = useMemo(() => ({
    usuario:   sesion?.usuario ?? null,
    esAdmin:   sesion?.usuario?.rol === "ADMINISTRADOR",
    iniciarSesion,
    cerrarSesion,
  }), [sesion, iniciarSesion, cerrarSesion]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { setToken, onSesionExpirada } from "../api/client";
import * as sgpa from "../api/sgpa";

const RENOVAR_CADA_MS = 4 * 60 * 1000;
const LS_KEY = "sgpa_sesion"; // clave en localStorage

export function AuthProvider({ children }) {
  // Intenta restaurar la sesión guardada al montar
  const [sesion, setSesion] = useState(() => {
    try {
      const guardada = localStorage.getItem(LS_KEY);
      if (!guardada) return null;
      const parsed = JSON.parse(guardada);
      // Restaura el token en el cliente HTTP
      setToken(parsed.token);
      return parsed;
    } catch {
      return null;
    }
  });

  const cerrarSesion = useCallback(async ({ avisarServidor = true } = {}) => {
    if (avisarServidor) await sgpa.logout().catch(() => {});
    setToken(null);
    setSesion(null);
    localStorage.removeItem(LS_KEY); // ← borra la sesión guardada
  }, []);

  const iniciarSesion = useCallback(async (username, password) => {
    const { token, usuario } = await sgpa.login(username, password);
    setToken(token);
    const nueva = { token, usuario };
    setSesion(nueva);
    localStorage.setItem(LS_KEY, JSON.stringify(nueva)); // ← guarda la sesión
    return usuario;
  }, []);

  // Si la API responde 401 se cierra la sesión local
  useEffect(() => {
    onSesionExpirada(() => {
      setToken(null);
      setSesion(null);
      localStorage.removeItem(LS_KEY);
    });
  }, []);

  // Renovación periódica del token mientras haya sesión
  useEffect(() => {
    if (!sesion) return undefined;
    const t = setInterval(async () => {
      try {
        const { token } = await sgpa.refresh();
        setToken(token);
        // Actualiza el token guardado sin tocar el objeto usuario
        setSesion(prev => {
          const actualizada = { ...prev, token };
          localStorage.setItem(LS_KEY, JSON.stringify(actualizada));
          return actualizada;
        });
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


import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import VistaPublica from "./pages/VistaPublica";
import Login from "./pages/Login";
import Panel from "./pages/Panel";

// Navegación: vista pública ↔ login → panel interno (si hay sesión)
export default function App() {
  const { usuario } = useAuth();
  const [vista, setVista] = useState("publica");

  if (usuario) return <Panel />;
  // Tras iniciar sesión se deja preparada la vista pública para cuando cierre sesión
  if (vista === "login") return <Login onVolver={()=>setVista("publica")} onIngresado={()=>setVista("publica")} />;
  return <VistaPublica onIrALogin={()=>setVista("login")} />;
}

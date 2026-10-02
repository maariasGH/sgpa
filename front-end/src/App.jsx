import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "./hooks/useAuth";
import VistaPublica from "./pages/VistaPublica";
import Login from "./pages/Login";
import Panel from "./pages/Panel";

// Rutas:
//   /                  calendario público (?fecha=YYYY-MM-DD y filtros en la URL)
//   /login             acceso interno
//   /panel/<pestaña>   panel interno (requiere sesión)
//   /panel/tv          vista TV
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VistaPublica />} />
      <Route path="/login" element={<SoloSinSesion><Login /></SoloSinSesion>} />
      <Route path="/panel/*" element={<RequiereSesion><Panel /></RequiereSesion>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Sin sesión (o si venció) manda al login y recuerda a dónde se quería ir
function RequiereSesion({ children }) {
  const { usuario } = useAuth();
  const location = useLocation();
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  return children;
}

// Con sesión iniciada el login no tiene sentido: vuelve a donde estaba o al panel
function SoloSinSesion({ children }) {
  const { usuario } = useAuth();
  const location = useLocation();
  if (usuario) return <Navigate to={location.state?.desde ?? "/panel"} replace />;
  return children;
}

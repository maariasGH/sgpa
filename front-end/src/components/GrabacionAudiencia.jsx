import { useEffect, useRef, useState } from "react";
import { C } from "../theme";
import { Alert, Btn } from "./ui";
import * as sgpa from "../api/sgpa";
import { mensajeError } from "../api/client";

// En estos estados la audiencia no se realizó: no se puede subir una grabación
const SIN_GRABACION = ["CANCELADA", "SUSPENDIDA"];

const esMp4 = (archivo) => archivo.type === "video/mp4" || /\.mp4$/i.test(archivo.name);

// Sección "Grabación" del detalle de una audiencia.
// Público: muestra el reproductor solo si hay video (si no, no se ve nada).
// Con `onActualizada` (Operador / Admin): además permite subir, reemplazar y quitar el MP4.
export default function GrabacionAudiencia({ audiencia: a, onActualizada }) {
  const gestiona = Boolean(onActualizada);
  const inputRef = useRef(null);
  const subidaRef = useRef(null);
  const [progreso, setProgreso] = useState(null); // null = sin subida en curso; 0..1
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState("");

  // Si se cierra el detalle con una subida en curso, se cancela
  useEffect(() => () => subidaRef.current?.cancelar(), []);

  const puedeSubir = gestiona && !SIN_GRABACION.includes(a.estado);
  if (!a.video && !puedeSubir) return null;

  const elegirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!esMp4(archivo)) { setError("El archivo debe ser un video MP4."); return; }

    setError(""); setConfirmarQuitar(false); setProgreso(0);
    subidaRef.current = sgpa.subirVideoAudiencia(a.id_audiencia, archivo, setProgreso);
    try {
      const r = await subidaRef.current.promesa;
      onActualizada(r.data);
    } catch (err) {
      if (err.code !== "CANCELADA") setError(mensajeError(err));
    } finally {
      subidaRef.current = null;
      setProgreso(null);
    }
  };

  const quitar = async () => {
    setQuitando(true); setError("");
    try {
      const r = await sgpa.quitarVideoAudiencia(a.id_audiencia);
      setConfirmarQuitar(false);
      onActualizada(r.data);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setQuitando(false);
    }
  };

  const subiendo = progreso !== null;
  const porcentaje = Math.round((progreso ?? 0) * 100);

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:12, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.5, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ display:"inline-block", width:3, height:14, background:C.blue, borderRadius:2 }}/>
        Grabación de la audiencia
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {a.video && (
        <video
          key={a.video}
          controls
          preload="metadata"
          src={sgpa.urlVideoAudiencia(a)}
          aria-label={`Grabación de la audiencia ${a.cuij}`}
          style={{ display:"block", width:"100%", maxHeight:280, background:"#000", borderRadius:8, marginBottom: gestiona ? 10 : 0 }}
        >
          Tu navegador no puede reproducir este video.
        </video>
      )}

      {gestiona && (
        <>
          <input ref={inputRef} type="file" accept="video/mp4,.mp4" onChange={elegirArchivo} hidden aria-hidden="true" tabIndex={-1} />

          {subiendo ? (
            <div style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px", background:"#F7FAFC" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:6 }}>
                <span>Subiendo grabación… no cierres este detalle</span>
                <span style={{ fontWeight:700, color:C.navy }}>{porcentaje}%</span>
              </div>
              <div role="progressbar" aria-label="Progreso de la subida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}
                style={{ height:8, background:C.border, borderRadius:4, overflow:"hidden", marginBottom:10 }}>
                <div style={{ width:`${porcentaje}%`, height:"100%", background:C.blue, transition:"width .2s" }} />
              </div>
              <Btn size="sm" variant="outline" onClick={()=>subidaRef.current?.cancelar()}>Cancelar subida</Btn>
            </div>
          ) : confirmarQuitar ? (
            <div style={{ border:`1px solid #FEB2B2`, background:C.redBg, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, color:C.red, fontWeight:600, flex:1, minWidth:160 }}>¿Quitar la grabación? Deja de verse en la vista pública.</span>
              <Btn size="sm" variant="danger" disabled={quitando} onClick={quitar}>{quitando ? "Quitando…" : "Sí, quitar"}</Btn>
              <Btn size="sm" variant="outline" disabled={quitando} onClick={()=>setConfirmarQuitar(false)}>No</Btn>
            </div>
          ) : a.video ? (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {puedeSubir && <Btn size="sm" variant="outline" onClick={()=>inputRef.current?.click()}>🔄 Reemplazar video</Btn>}
              <Btn size="sm" variant="outline" style={{ color:C.red, borderColor:C.red }} onClick={()=>setConfirmarQuitar(true)}>🗑️ Quitar video</Btn>
            </div>
          ) : (
            <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:8, padding:"16px 14px", textAlign:"center", background:"#FAFCFF" }}>
              <div style={{ fontSize:13, color:C.muted, marginBottom:10 }}>Esta audiencia todavía no tiene grabación.</div>
              <Btn size="sm" onClick={()=>inputRef.current?.click()}>📤 Subir grabación (MP4)</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

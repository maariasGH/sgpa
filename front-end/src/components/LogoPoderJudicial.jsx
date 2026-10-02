import logo from "../assets/logo-poder-judicial.png";

// Logo institucional del Poder Judicial de Santa Fe. El PNG es gris sobre fondo
// transparente, así que va sobre una placa blanca para leerse en los headers oscuros.
export default function LogoPoderJudicial({ alto=36 }) {
  const padV = Math.round(alto * 0.12);
  return (
    <div style={{ background:"#FFFFFF", borderRadius:6, padding:`${padV}px ${padV * 2}px`, display:"flex", alignItems:"center", flexShrink:0 }}>
      <img src={logo} alt="Poder Judicial — Provincia de Santa Fe" style={{ height:alto - padV * 2, width:"auto", display:"block" }} />
    </div>
  );
}

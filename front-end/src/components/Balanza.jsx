import { C } from "../theme";

// Logo institucional (balanza de la justicia)
export default function Balanza({ size=36, bg=C.blue, radius=6 }) {
  const s = size;
  return (
    <div style={{ width:s, height:s, background:bg, borderRadius:radius, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width={s*0.72} height={s*0.72} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="17" y="4" width="2" height="22" rx="1" fill="white"/>
        <rect x="10" y="26" width="16" height="2.5" rx="1.2" fill="white"/>
        <rect x="14" y="28.5" width="8" height="2" rx="1" fill="rgba(255,255,255,0.6)"/>
        <rect x="6" y="9" width="24" height="2" rx="1" fill="white"/>
        <line x1="8" y1="11" x2="6" y2="17" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="6" y1="17" x2="8" y2="17" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M3 17 Q6 20.5 9 17" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.18)" strokeLinecap="round"/>
        <line x1="28" y1="11" x2="30" y2="17" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="30" y1="17" x2="28" y2="17" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M27 17 Q30 20.5 33 17" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.18)" strokeLinecap="round"/>
        <circle cx="18" cy="9" r="1.8" fill="white"/>
        <circle cx="18" cy="4.5" r="1.2" fill="rgba(255,255,255,0.7)"/>
      </svg>
    </div>
  );
}

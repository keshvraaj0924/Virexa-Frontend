/** Original vector silk: deterministic geometry, no network or GPU requirement. */
export function SilkWave({ className = '' }: { className?: string }) {
  return <svg className={`vx-silk ${className}`} viewBox="0 0 1440 760" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="silk-blue" x1="0" y1="640" x2="1440" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#2d73ff" stopOpacity="0"/><stop offset=".28" stopColor="#398dff"/><stop offset=".58" stopColor="#a888ff"/><stop offset=".8" stopColor="#4868ef"/><stop offset="1" stopColor="#4bcaff" stopOpacity=".3"/></linearGradient><linearGradient id="silk-fill" x1="580" y1="270" x2="700" y2="690" gradientUnits="userSpaceOnUse"><stop stopColor="#6e8fff" stopOpacity=".19"/><stop offset="1" stopColor="#5358ee" stopOpacity="0"/></linearGradient></defs>
    <path d="M-100 580 C160 130 350 840 650 430 S1060 650 1540 120 L1540 760H-100Z" fill="url(#silk-fill)"/>
    {Array.from({ length: 64 }, (_, i) => <path key={i} d={`M-100 ${560+i*2.7} C ${160+i*2} ${100+i*6}, ${350-i*1.1} ${840-i*3.4}, ${650+i*1.5} ${430+i*.8} S ${1060-i*1.4} ${650-i*4}, 1540 ${90+i*5.8}`} stroke="url(#silk-blue)" strokeWidth={i%8===0 ? 1.2 : .6} opacity={.18+(i%11)*.035}/>)}
  </svg>
}

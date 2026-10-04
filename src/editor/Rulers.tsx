const tick = (mm: number) => (mm % 10 === 0 ? 9 : mm % 5 === 0 ? 6 : 3)

export function Rulers({ widthMm, heightMm, scale }: { widthMm: number; heightMm: number; scale: number }) {
  const px = (mm: number) => (mm * 96 * scale) / 25.4
  const step = scale < 0.6 ? 5 : 1
  const xs = Array.from({ length: Math.floor(widthMm / step) + 1 }, (_, i) => i * step)
  const ys = Array.from({ length: Math.floor(heightMm / step) + 1 }, (_, i) => i * step)
  const w = px(widthMm)
  const h = px(heightMm)
  return (
    <>
      <svg className="ws-ruler ws-ruler-x" width={w} height={22} aria-hidden="true">
        {xs.map((mm) => (
          <line key={mm} x1={px(mm) + 0.5} x2={px(mm) + 0.5} y1={22} y2={22 - tick(mm)} />
        ))}
        {xs.filter((mm) => mm % (scale < 0.6 ? 50 : 10) === 0).map((mm) => (
          <text key={`t${mm}`} x={px(mm) + 3} y={10}>{mm}</text>
        ))}
      </svg>
      <svg className="ws-ruler ws-ruler-y" width={22} height={h} aria-hidden="true">
        {ys.map((mm) => (
          <line key={mm} y1={px(mm) + 0.5} y2={px(mm) + 0.5} x1={22} x2={22 - tick(mm)} />
        ))}
        {ys.filter((mm) => mm % (scale < 0.6 ? 50 : 10) === 0 && mm > 0).map((mm) => (
          <text key={`t${mm}`} x={11} y={px(mm) - 3} transform={`rotate(-90 11 ${px(mm) - 3})`}>{mm}</text>
        ))}
      </svg>
      <svg className="ws-reg ws-reg-tl" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="4.5" /><path d="M9 0v18M0 9h18" /></svg>
      <svg className="ws-reg ws-reg-br" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="4.5" /><path d="M9 0v18M0 9h18" /></svg>
    </>
  )
}

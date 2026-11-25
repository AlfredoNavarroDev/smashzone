import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { buildGlassMosaic, type GlassShape } from './glass-mosaic-geometry'
import { GlassContext } from './glass-mosaic-context'

export default function GlassMosaic({ children, className = 'negocio-dashboard' }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ width: 1, height: 1, shapes: {} as Record<string, GlassShape>, seams: '', fragments: [] as string[] })
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    let frame = 0
    const measure = () => {
      const origin = el.getBoundingClientRect()
      const rects = [...el.querySelectorAll<SVGSVGElement>('[data-glass-piece]')].map(surface => {
        const box = surface.parentElement!.getBoundingClientRect()
        return { id: surface.dataset.glassPiece!, x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height }
      })
      if (!rects.length) return
      const height = Math.max(...rects.map(r => r.y + r.height))
      const result = buildGlassMosaic(rects, origin.width, height)
      setLayout({ width: origin.width, height, ...result })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(el)
    el.querySelectorAll('[data-glass-piece]').forEach(surface => observer.observe(surface.parentElement!))
    measure()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])
  return <GlassContext.Provider value={layout.shapes}>
    <div ref={root} className={className}>
      <svg className="glass-mosaic-seams" style={{ height: layout.height }} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
        <g fill="none" strokeLinejoin="round">
          <path d={layout.seams} stroke="#c6ced5" strokeOpacity=".07" strokeWidth="2.6" />
          <path d={layout.seams} stroke="#bac2ca" strokeOpacity=".38" strokeWidth="1" />
          {layout.fragments.map((d,i) => <path key={i} d={d} fill="#161a20" fillOpacity=".15" stroke="#bac2ca" strokeOpacity=".38" strokeWidth="1" />)}
        </g>
      </svg>
      {children}
    </div>
  </GlassContext.Provider>
}

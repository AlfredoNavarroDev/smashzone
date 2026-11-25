import { useEffect, useId, useRef } from 'react'
import { useGlassShape } from './glass-mosaic-context'
import { glassImageLayout } from './glass-image-layout'

/** Cada pieza es un PNG completo: vidrio, reflejos y borde forman una sola imagen. */
export default function GlassPanelSurface({ piece, warm = false }: { piece: string; warm?: boolean | 'bottom-right' }) {
  const id = useId().replace(/:/g, '')
  const shape = useGlassShape(piece)
  const surfaceRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const surface = surfaceRef.current
    const card = surface?.parentElement
    if (!surface || !card) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const current = { x: 0, y: 0, lift: 0 }
    const target = { x: 0, y: 0, lift: 0 }
    const tick = () => {
      current.x += (target.x - current.x) * .12
      current.y += (target.y - current.y) * .12
      current.lift += (target.lift - current.lift) * .12
      surface.style.transform = `perspective(1000px) translateY(${-current.lift * 1.5}px) rotateX(${current.y * -1}deg) rotateY(${current.x * 1.4}deg) scale(${1 + current.lift * .002})`
      surface.style.filter = `brightness(${1 + current.lift * .12}) drop-shadow(0 ${12 + current.lift * 16}px ${14 + current.lift * 14}px #000a)`
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) + Math.abs(target.lift - current.lift) > .002) frame = requestAnimationFrame(tick)
      else frame = 0
    }
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick) }
    const move = (event: PointerEvent) => {
      if (media.matches || event.pointerType === 'touch') return
      const rect = card.getBoundingClientRect()
      target.x = ((event.clientX - rect.left) / rect.width - .5) * 2
      target.y = ((event.clientY - rect.top) / rect.height - .5) * 2
      target.lift = 1
      wake()
    }
    const leave = () => { target.x = 0; target.y = 0; target.lift = 0; wake() }
    const reset = () => {
      cancelAnimationFrame(frame)
      frame = 0
      Object.assign(current, { x: 0, y: 0, lift: 0 })
      Object.assign(target, current)
      surface.style.transform = ''
      surface.style.filter = ''
    }
    card.addEventListener('pointermove', move)
    card.addEventListener('pointerleave', leave)
    media.addEventListener('change', reset)
    return () => {
      reset()
      card.removeEventListener('pointermove', move)
      card.removeEventListener('pointerleave', leave)
      media.removeEventListener('change', reset)
    }
  }, [])
  const width = shape?.width ?? 400, height = shape?.height ?? 220
  const bounds = glassImageLayout[piece]
  const x = bounds.x * width, y = bounds.y * height
  const imageWidth = bounds.width * width, imageHeight = bounds.height * height
  const asset = `/images/glass/pieces/${piece}.png`
  return <svg ref={surfaceRef} data-glass-piece={piece} className="glass-panel-surface" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
    {warm && <defs><mask id={`${id}-warm`} maskUnits="userSpaceOnUse" x={x} y={y} width={imageWidth} height={imageHeight} style={{ maskType: 'alpha' }}>
      <image href={asset} x={x} y={y} width={imageWidth} height={imageHeight} preserveAspectRatio="none" />
    </mask></defs>}
    <image href={asset} x={x} y={y} width={imageWidth} height={imageHeight} preserveAspectRatio="none" style={{ filter: 'grayscale(1)' }} />
    {warm && <g mask={`url(#${id}-warm)`} style={{ mixBlendMode: 'screen' }}>
      <image href="/images/ingresos-luz.png" x={x} y={y} width={imageWidth} height={imageHeight} preserveAspectRatio="none" opacity=".4" transform={warm === 'bottom-right' ? `rotate(180 ${x + imageWidth / 2} ${y + imageHeight / 2})` : undefined} />
    </g>}
  </svg>
}

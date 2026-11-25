import { useEffect, useId, useState } from 'react'
import { fitGlassImageAsync } from './fitGlassImageAsync'
import { polygonPath } from '../../components/ui/glass-mosaic-geometry'
import { useGlassShape } from '../../components/ui/glass-mosaic-context'

type Region = 'total' | 'recent' | 'enabled' | 'disabled' | 'filters' | 'directory' | 'activity-summary' | 'activity-chart'

const tailoredAssets = {
  directory: { path: '/images/glass/users/directory-thin-v3.png', viewBox: '13 18 1660 895', width: 1686, height: 933 },
  'activity-chart': { path: '/images/glass/users/activity-chart-thin-v3.png', viewBox: '16 72 2128 578', width: 2169, height: 725 },
} as const

export default function UsersGlass({ region }: { region: Region }) {
  const id = useId().replace(/:/g, '')
  const shape = useGlassShape(region)
  const tailored = region === 'directory' || region === 'activity-chart' ? tailoredAssets[region] : null
  const [fitted, setFitted] = useState<Awaited<ReturnType<typeof fitGlassImageAsync>> | null>(null)
  useEffect(() => {
    if (tailored || !shape) return
    let cancelled = false
    let objectUrl: string | null = null
    const asset = region === 'activity-summary'
      ? '/images/glass/users/activity-summary-balanced-v3.png'
      : `/images/glass/users/${region}-piece.png`
    void fitGlassImageAsync(shape, asset)
      .then(result => {
        if (result.href.startsWith('blob:')) objectUrl = result.href
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
        } else setFitted(result)
      })
      .catch(error => console.error(error))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [region, shape, tailored])

  // GlassMosaic mide estos SVG en el primer render para construir los contornos.
  if (!shape) return <svg className="usuarios-piece-glass" data-glass-piece={region} aria-hidden="true" />
  const { width, height, face } = shape
  if (tailored) {
    const x = Math.min(...face.map(p => p.x))
    const y = Math.min(...face.map(p => p.y))
    const w = Math.max(...face.map(p => p.x)) - x
    const h = Math.max(...face.map(p => p.y)) - y
    const clipId = `${id}-face`
    return <svg className="usuarios-piece-glass" data-glass-piece={region} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={clipId}><path d={polygonPath(face)} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <svg x={x} y={y} width={w} height={h} viewBox={tailored.viewBox} preserveAspectRatio="none" overflow="hidden">
          <image href={tailored.path} width={tailored.width} height={tailored.height} />
        </svg>
      </g>
    </svg>
  }
  return <svg className="usuarios-piece-glass" data-glass-piece={region} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {fitted && <image {...fitted} preserveAspectRatio="none" style={{ filter: 'grayscale(1)' }} />}
  </svg>
}

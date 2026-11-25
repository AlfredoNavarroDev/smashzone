import type { GlassShape, Point } from '../../components/ui/glass-mosaic-geometry'

const SAMPLES = 4096
const sources = new Map<string, Promise<{ pixels: ImageData; radii: Float64Array }>>()

function sourceGlass(asset: string) {
  const cached = sources.get(asset)
  if (cached) return cached
  const pending = new Promise<{ pixels: ImageData; radii: Float64Array }>((resolve, reject) => {
    const image = new Image()
    image.onerror = () => { sources.delete(asset); reject(new Error('No se pudo cargar el vidrio')) }
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const radii = new Float64Array(SAMPLES)
      // Detectar la frontera real del PNG desde el centro opaco hacia fuera.
      for (let i = 0; i < SAMPLES; i++) {
        const angle = i * Math.PI * 2 / SAMPLES
        const dx = Math.cos(angle), dy = Math.sin(angle)
        const step = .5 / Math.max(canvas.width, canvas.height)
        for (let radius = 0; radius < 1; radius += step) {
          const x = Math.round((.5 + dx * radius) * (canvas.width - 1))
          const y = Math.round((.5 + dy * radius) * (canvas.height - 1))
          if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height || pixels.data[(y * canvas.width + x) * 4 + 3] < 128) {
            radii[i] = radius
            break
          }
        }
      }
      resolve({ pixels, radii })
    }
    image.src = asset
  })
  sources.set(asset, pending)
  return pending
}

function boundaryRadius(dx: number, dy: number, points: Point[]) {
  let nearest = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    const ex = b.x - a.x, ey = b.y - a.y
    const cross = dx * ey - dy * ex
    if (Math.abs(cross) < 1e-10) continue
    const t = (a.x * ey - a.y * ex) / cross
    const u = (a.x * dy - a.y * dx) / cross
    if (t > 0 && u >= 0 && u <= 1) nearest = Math.min(nearest, t)
  }
  return nearest
}

/** Deforma el PNG completo hasta el contorno, conservando su propio bisel. */
export async function fitGlassImage(shape: GlassShape, asset: string) {
  const { pixels, radii } = await sourceGlass(asset)
  const x = Math.min(...shape.face.map(p => p.x)) - 2
  const y = Math.min(...shape.face.map(p => p.y)) - 2
  const width = Math.max(...shape.face.map(p => p.x)) + 2 - x
  const height = Math.max(...shape.face.map(p => p.y)) + 2 - y
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  const ctx = canvas.getContext('2d')!
  const output = ctx.createImageData(canvas.width, canvas.height)
  const polygon = shape.face.map(p => ({ x: (p.x - x) / width - .5, y: (p.y - y) / height - .5 }))
  for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    const dx = (px + .5) / canvas.width - .5, dy = (py + .5) / canvas.height - .5
    const distance = Math.hypot(dx, dy)
    const ux = distance ? dx / distance : 1, uy = distance ? dy / distance : 0
    const limit = boundaryRadius(ux, uy, polygon)
    if (distance > limit) continue
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)
    const sample = angle / (Math.PI * 2) * SAMPLES
    const index = Math.floor(sample), blend = sample - index
    const sourceRadius = radii[index] * (1 - blend) + radii[(index + 1) % SAMPLES] * blend
    const fraction = distance / limit
    const sx = Math.max(0, Math.min(pixels.width - 1, (.5 + ux * sourceRadius * fraction) * (pixels.width - 1)))
    const sy = Math.max(0, Math.min(pixels.height - 1, (.5 + uy * sourceRadius * fraction) * (pixels.height - 1)))
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0 + 1, pixels.width - 1), y1 = Math.min(y0 + 1, pixels.height - 1)
    const tx = sx - x0, ty = sy - y0
    const dest = (py * canvas.width + px) * 4
    for (let c = 0; c < 4; c++) {
      const a = pixels.data[(y0 * pixels.width + x0) * 4 + c] * (1 - tx) + pixels.data[(y0 * pixels.width + x1) * 4 + c] * tx
      const b = pixels.data[(y1 * pixels.width + x0) * 4 + c] * (1 - tx) + pixels.data[(y1 * pixels.width + x1) * 4 + c] * tx
      output.data[dest + c] = a * (1 - ty) + b * ty
    }
  }
  ctx.putImageData(output, 0, 0)
  return { href: canvas.toDataURL('image/png'), x, y, width, height }
}

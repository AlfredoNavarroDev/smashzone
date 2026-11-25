import type { GlassShape, Point } from '../../components/ui/glass-mosaic-geometry'

type Request = { id: number; shape: GlassShape; asset: string; scale: number }
type Source = { pixels: ImageData; radii: Float64Array }

const SAMPLES = 4096
const sources = new Map<string, Promise<Source>>()

function sourceGlass(asset: string): Promise<Source> {
  const cached = sources.get(asset)
  if (cached) return cached
  const pending = (async () => {
    const response = await fetch(asset)
    if (!response.ok) throw new Error('No se pudo cargar el vidrio')
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    const radii = new Float64Array(SAMPLES)
    const { width, height, data } = pixels
    const outside = (dx: number, dy: number, radius: number) => {
      const x = Math.round((.5 + dx * radius) * (width - 1))
      const y = Math.round((.5 + dy * radius) * (height - 1))
      return x < 0 || y < 0 || x >= width || y >= height || data[(y * width + x) * 4 + 3] < 128
    }
    for (let i = 0; i < SAMPLES; i++) {
      const angle = i * Math.PI * 2 / SAMPLES
      const dx = Math.cos(angle), dy = Math.sin(angle)
      let low = 0, high = 1
      for (let step = 0; step < 14; step++) {
        const middle = (low + high) / 2
        if (outside(dx, dy, middle)) high = middle
        else low = middle
      }
      radii[i] = high
    }
    return { pixels, radii }
  })().catch(error => { sources.delete(asset); throw error })
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

async function fit({ shape, asset, scale }: Request) {
  const { pixels, radii } = await sourceGlass(asset)
  const x = Math.min(...shape.face.map(p => p.x)) - 2
  const y = Math.min(...shape.face.map(p => p.y)) - 2
  const width = Math.max(...shape.face.map(p => p.x)) + 2 - x
  const height = Math.max(...shape.face.map(p => p.y)) + 2 - y
  const canvas = new OffscreenCanvas(Math.ceil(width * scale), Math.ceil(height * scale))
  const context = canvas.getContext('2d')!
  const output = context.createImageData(canvas.width, canvas.height)
  const polygon = shape.face.map(p => ({ x: (p.x - x) / width - .5, y: (p.y - y) / height - .5 }))
  const targetRadii = new Float64Array(SAMPLES)
  for (let i = 0; i < SAMPLES; i++) {
    const angle = i * Math.PI * 2 / SAMPLES
    targetRadii[i] = boundaryRadius(Math.cos(angle), Math.sin(angle), polygon)
  }

  for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    const dx = (px + .5) / canvas.width - .5, dy = (py + .5) / canvas.height - .5
    const distance = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)
    const sample = angle / (Math.PI * 2) * SAMPLES
    const index = Math.floor(sample), blend = sample - index
    const limit = targetRadii[index] * (1 - blend) + targetRadii[(index + 1) % SAMPLES] * blend
    if (distance > limit) continue
    const sourceRadius = radii[index] * (1 - blend) + radii[(index + 1) % SAMPLES] * blend
    const fraction = distance / limit
    const ux = distance ? dx / distance : 1, uy = distance ? dy / distance : 0
    const sx = Math.max(0, Math.min(pixels.width - 1, (.5 + ux * sourceRadius * fraction) * (pixels.width - 1)))
    const sy = Math.max(0, Math.min(pixels.height - 1, (.5 + uy * sourceRadius * fraction) * (pixels.height - 1)))
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0 + 1, pixels.width - 1), y1 = Math.min(y0 + 1, pixels.height - 1)
    const tx = sx - x0, ty = sy - y0
    const dest = (py * canvas.width + px) * 4
    for (let channel = 0; channel < 4; channel++) {
      const a = pixels.data[(y0 * pixels.width + x0) * 4 + channel] * (1 - tx) + pixels.data[(y0 * pixels.width + x1) * 4 + channel] * tx
      const b = pixels.data[(y1 * pixels.width + x0) * 4 + channel] * (1 - tx) + pixels.data[(y1 * pixels.width + x1) * 4 + channel] * tx
      output.data[dest + channel] = a * (1 - ty) + b * ty
    }
  }
  context.putImageData(output, 0, 0)
  return { blob: await canvas.convertToBlob({ type: 'image/png' }), x, y, width, height }
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id } = event.data
  try {
    self.postMessage({ id, result: await fit(event.data) })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Error al procesar el vidrio' })
  }
}

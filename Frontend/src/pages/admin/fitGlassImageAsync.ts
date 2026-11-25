import type { GlassShape } from '../../components/ui/glass-mosaic-geometry'

type FittedBlob = { blob: Blob; x: number; y: number; width: number; height: number }
type FittedImage = { href: string; x: number; y: number; width: number; height: number }
type WorkerResponse = { id: number; result?: FittedBlob; error?: string }

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (result: FittedBlob) => void; reject: (error: Error) => void }>()
const results = new Map<string, Promise<FittedBlob>>()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./fitGlassImage.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id)
    if (data.result) request.resolve(data.result)
    else request.reject(new Error(data.error ?? 'Error al procesar el vidrio'))
  }
  worker.onerror = () => {
    for (const request of pending.values()) request.reject(new Error('No se pudo procesar el vidrio'))
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/** Mantiene el ajuste costoso fuera del hilo de la interfaz y reutiliza el resultado por tamaño. */
export async function fitGlassImageAsync(shape: GlassShape, asset: string): Promise<FittedImage> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    const { fitGlassImage } = await import('./fitGlassImage')
    return fitGlassImage(shape, asset)
  }
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const key = `${asset}:${scale}:${shape.width.toFixed(2)}:${shape.height.toFixed(2)}:${shape.face.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(';')}`
  let result = results.get(key)
  if (!result) {
    const id = ++nextId
    result = new Promise<FittedBlob>((resolve, reject) => pending.set(id, { resolve, reject }))
    results.set(key, result)
    result.catch(() => results.delete(key))
    getWorker().postMessage({ id, shape, asset, scale })
    if (results.size > 24) results.delete(results.keys().next().value!)
  }
  const { blob, ...bounds } = await result
  return { href: URL.createObjectURL(blob), ...bounds }
}

export type Point = { x: number; y: number }
export type GlassRect = { id: string; x: number; y: number; width: number; height: number }
export type GlassShape = { width: number; height: number; face: Point[] }
export const polygonPath = (points: Point[]) => points.length ? `M${points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L')} Z` : ''
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** Offset every edge inward, so neighboring faces have an actual, constant-width joint. */
export function insetPolygon(points: Point[], amount: number): Point[] {
  return points.map((p, i) => {
    const before = points[(i + points.length - 1) % points.length], after = points[(i + 1) % points.length]
    const l1 = distance(before, p), l2 = distance(p, after)
    const u = { x: (p.x - before.x) / l1, y: (p.y - before.y) / l1 }
    const v = { x: (after.x - p.x) / l2, y: (after.y - p.y) / l2 }
    const a = { x: p.x - u.y * amount, y: p.y + u.x * amount }
    const b = { x: p.x - v.y * amount, y: p.y + v.x * amount }
    const cross = u.x * v.y - u.y * v.x
    if (Math.abs(cross) < .0001) return a
    const t = ((b.x - a.x) * v.y - (b.y - a.y) * v.x) / cross
    return { x: a.x + t * u.x, y: a.y + t * u.y }
  })
}
function chipCorners(points: Point[], junctions: Point[]): Point[] {
  return points.flatMap((p, i) => {
    const prev = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length]
    const atJunction = junctions.some(j => distance(j, p) < 24)
    const cut = Math.min(atJunction ? 25 : 6, distance(p, prev) * .3, distance(p, next) * .3)
    return [mix(p, prev, cut / distance(p, prev)), mix(p, next, cut / distance(p, next))]
  })
}

/** All tiles use the SAME vertices/edges, including T junctions. No independent outlines. */
export function buildGlassMosaic(rects: GlassRect[], width: number, height: number) {
  const key = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  const corners = new Map<string, Point>()
  for (const r of rects) for (const p of [{ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y }, { x: r.x + r.width, y: r.y + r.height }, { x: r.x, y: r.y + r.height }]) corners.set(key(p), p)
  const points = [...corners.values()]
  const warp = (p: Point): Point => ({
    x: p.x < 1 || p.x > width - 1 ? p.x : p.x + Math.sin(p.x * .017 + p.y * .009) * Math.min(48, width * .038),
    y: p.y < 1 || p.y > height - 1 ? p.y : p.y + Math.sin(p.x * .012 + p.y * .008) * 36,
  })
  const edges = new Map<string, Point[]>()
  const edge = (a: Point, b: Point): Point[] => {
    const ordered = a.x < b.x || (a.x === b.x && a.y < b.y)
    const first = ordered ? a : b, last = ordered ? b : a
    const id = `${key(first)}:${key(last)}`
    if (!edges.has(id)) {
      const wa = warp(first), wb = warp(last)
      const middle = mix(wa, wb, .57)
      const vertical = Math.abs(first.x - last.x) < 1
      const outer = vertical ? first.x < 1 || first.x > width - 1 : first.y < 1 || first.y > height - 1
      if (!outer) {
        const offset = Math.sin(first.x * .021 + last.y * .014) * Math.min(22, distance(first, last) * .1)
        if (vertical) middle.x += offset
        else middle.y += offset
      }
      edges.set(id, [wa, middle, wb])
    }
    const result = edges.get(id)!
    return ordered ? result : [...result].reverse()
  }
  const junctions = points.filter(p => p.x > 1 && p.x < width - 1 && p.y > 1 && p.y < height - 1 && rects.filter(r => (Math.abs(p.x-r.x)<.5 || Math.abs(p.x-r.x-r.width)<.5 || Math.abs(p.y-r.y)<.5 || Math.abs(p.y-r.y-r.height)<.5) && p.x >= r.x-.5 && p.x <= r.x+r.width+.5 && p.y >= r.y-.5 && p.y <= r.y+r.height+.5).length >= 3).map(warp)
  const shapes: Record<string, GlassShape> = {}
  for (const r of rects) {
    const top = points.filter(p => Math.abs(p.y - r.y) < .5 && p.x >= r.x - .5 && p.x <= r.x + r.width + .5).sort((a,b) => a.x - b.x)
    const right = points.filter(p => Math.abs(p.x - r.x - r.width) < .5 && p.y >= r.y - .5 && p.y <= r.y + r.height + .5).sort((a,b) => a.y - b.y)
    const bottom = points.filter(p => Math.abs(p.y - r.y - r.height) < .5 && p.x >= r.x - .5 && p.x <= r.x + r.width + .5).sort((a,b) => b.x - a.x)
    const left = points.filter(p => Math.abs(p.x - r.x) < .5 && p.y >= r.y - .5 && p.y <= r.y + r.height + .5).sort((a,b) => b.y - a.y)
    const boundary = [top, right, bottom, left].flatMap(side => side.slice(0,-1).flatMap((p,i) => edge(p,side[i+1]).slice(0,-1)))
    const local = boundary.map(p => ({ x: p.x - r.x, y: p.y - r.y }))
    shapes[r.id] = { width: r.width, height: r.height, face: chipCorners(insetPolygon(local, 9), junctions.map(p => ({ x: p.x-r.x, y: p.y-r.y }))) }
  }
  const branches = new Map<string, Point[]>()
  const seams = [...edges.values()].map(ps => {
    const line = [...ps]
    for (const index of [0, line.length - 1]) {
      const p = line[index]
      const junction = junctions.find(j => distance(j, p) < .1)
      if (!junction) continue
      const toward = line[index === 0 ? 1 : index - 1]
      const tip = mix(p, toward, Math.min(22 / distance(p, toward), .3))
      line[index] = tip
      const id = key(junction)
      branches.set(id, [...(branches.get(id) ?? []), tip])
    }
    return `M${line.map(p => `${p.x},${p.y}`).join(' L')}`
  }).join(' ')
  const fragments = [...branches.entries()].map(([id, tips]) => {
    const center = junctions.find(p => key(p) === id)!
    return polygonPath(tips.sort((a,b) => Math.atan2(a.y-center.y,a.x-center.x)-Math.atan2(b.y-center.y,b.x-center.x)))
  })
  return { shapes, seams, fragments }
}

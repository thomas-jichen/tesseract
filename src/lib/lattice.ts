import * as THREE from 'three'
import { FUTURE_SLICES, LEAD_SLICES, MAX_GAP, NOW } from './config'
import { warm } from './palette'

// An infinite cubic lattice of strand bundles in all three axes (tiled around the camera in the shader).
export const P = 11 // lattice period
export const B = 3.0 // bundle thickness
export const M = 9 // cells per tile side
export const L = P * M // tile size

export interface Item {
  id: string
  kind: 'input' | 'output'
  medium: string
  title: string
  date: string
  image: string
  model?: string
  influences?: string[]
  rating?: number
  approx?: boolean
  ai?: number // Pangram AI likelihood of the image (0..1)
  verified?: boolean | null
  reviewHuman?: boolean
}

export const isDead = (it: Item) => (it.ai ?? 0) >= 0.7 // Pangram flagged: AI-made, can't carry a thread

export interface Slice { month: string; future: boolean; now: boolean }
export interface Moment {
  index: number
  item: Item
  slice: number
  pos: THREE.Vector3
  normal: THREE.Vector3
  w: number
  h: number
  track: [number, number]
  quat: THREE.Quaternion
  up: THREE.Vector3
}
export interface Tess {
  slices: Slice[]
  moments: Moment[]
  strands: { matrices: Float32Array; colors: Float32Array; count: number }
  lights: { matrices: Float32Array; colors: Float32Array; count: number }
  tracks: { matrices: Float32Array; colors: Float32Array; count: number }
  trackLights: { matrices: Float32Array; colors: Float32Array; count: number }
  shelves: { matrices: Float32Array; seeds: Float32Array; count: number }
  links: { from: number; to: number; strength: number }[]
  path: (t: number) => THREE.Vector3
  sliceZ: (s: number) => number
}

// The film's tesseract palette: bronze, khaki, cream, steel, slate, with rare cold light.
const FILM = ['#6b5233', '#8b7d5a', '#cfc2a0', '#7a4a2c', '#e6dcc4', '#a08a62', '#2a2724', '#b59a6a', '#1c1a17', '#d8c9a3', '#5e4632', '#9c7b52', '#c4a77a', '#3a3128', '#5d6670', '#8a8f8e']

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const addMonths = (m: string, n: number) => {
  const [y, mo] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7)
}
const monthDiff = (a: string, b: string) => {
  const [ya, ma] = a.split('-').map(Number)
  const [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}

function buildSlices(items: Item[]) {
  const months = [...new Set(items.map((i) => i.date))].sort()
  const first = months[0]
  const slices: Slice[] = []
  const index = new Map<string, number>()
  let empty = 0
  for (let m = addMonths(first, -LEAD_SLICES); m <= addMonths(NOW, FUTURE_SLICES); m = addMonths(m, 1)) {
    const has = months.includes(m)
    empty = has ? 0 : empty + 1
    const next = months.find((x) => x > m)
    const nearNext = next ? monthDiff(m, next) <= 1 : false
    if (!has && m > first && m <= NOW && empty > MAX_GAP && !nearNext && monthDiff(m, NOW) > 1) continue
    index.set(m, slices.length)
    slices.push({ month: m, future: m > NOW, now: m === NOW })
  }
  return { slices, index }
}

export function buildTesseract(items: Item[], palettes: Map<string, THREE.Color[]>, aspects: Map<string, number>): Tess {
  const rand = rng(11)
  const { slices, index } = buildSlices(items)

  // Strand colours: the film's palette, threaded with the colours of what Thomas kept.
  const kept: THREE.Color[] = []
  for (const it of items) for (const c of (palettes.get(it.id) ?? []).slice(0, 2)) kept.push(warm(c, 0.6))
  const film = FILM.map((c) => new THREE.Color(c))
  const pick = () => (kept.length && rand() < 0.1 ? kept[Math.floor(rand() * kept.length)] : film[Math.floor(rand() * film.length)])

  // 1. Bundles: for each axis, M×M bundles through the tile; each bundle is a loose grid of strands.
  const sm: number[] = []
  const sc: number[] = []
  const lm: number[] = []
  const lc: number[] = []
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  // A strand broken into irregular segments. The break pattern is periodic in L (generated on a loop and laid
  // down twice over [-L, L)), so the infinite tiling can shift it by L without anything popping.
  const strand = (axis: number, o1: number, o2: number, w1: number, w2: number, c: THREE.Color, k: number) => {
    const segs: [number, number][] = []
    let z = 0
    const start = rand() * L
    while (z < L) {
      const len = rand() < 0.88 ? L * (0.4 + rand() * 0.6) : 2 + rand() * 10
      const z1 = Math.min(L, z + len)
      segs.push([z, z1])
      z = z1 + (rand() < 0.25 ? 0.3 + rand() * 4 : 0)
    }
    const emit = (a: number, b: number) => {
      const mid = (a + b) / 2
      const ln = b - a
      if (ln < 0.05) return
      if (axis === 0) { p.set(mid, o1, o2); s.set(ln, w1, w2) }
      else if (axis === 1) { p.set(o1, mid, o2); s.set(w1, ln, w2) }
      else { p.set(o1, o2, mid); s.set(w1, w2, ln) }
      m4.compose(p, q, s)
      sm.push(...m4.elements)
      sc.push(c.r * k, c.g * k, c.b * k)
    }
    for (const [a0, b0] of segs) {
      // rotate the loop by `start`, splitting segments that cross the seam
      let a = (a0 + start) % L
      let b = a + (b0 - a0)
      const parts: [number, number][] = b <= L ? [[a, b]] : [[a, L], [0, b - L]]
      for (const [pa, pb] of parts) for (const kL of [-L, 0]) emit(pa + kL, pb + kL)
      a = b = 0
    }
  }
  const h0 = P / 2
  for (let axis = 0; axis < 3; axis++)
    for (let i = 0; i < M; i++)
      for (let j = 0; j < M; j++) {
        const a0 = -L / 2 + i * P
        const b0 = -L / 2 + j * P
        if (rand() < 0.1) continue // the occasional missing bundle
        // every bundle is its own shape: rectangular, off-grid, sometimes split into parallel sub-bundles
        const subs = rand() < 0.35 ? 2 + Math.floor(rand() * 2) : 1
        // perpendicular jitter; keep cross-planes near their slice plane so moments stay clear
        let ja = (rand() - 0.5) * (axis === 2 ? 3.2 : 2.6)
        const jb = (rand() - 0.5) * (axis === 2 ? 3.2 : 1.0)
        // bundles framing the void you drift through only ever lean outward
        if (axis !== 2 && Math.abs(Math.abs(a0) - h0) < 0.01) ja = Math.sign(a0) * rand() * 1.4
        for (let sb = 0; sb < subs; sb++) {
          const b1 = (subs > 1 ? 1.0 + rand() * 1.8 : 2.0 + rand() * 3.2)
          const b2 = (subs > 1 ? 1.0 + rand() * 1.8 : 1.8 + rand() * 3.0)
          const a = a0 + ja + (subs > 1 ? (sb - (subs - 1) / 2) * (b1 + 0.4 + rand() * 1.4) : 0)
          const b = b0 + jb + (subs > 1 ? (rand() - 0.5) * 1.6 : 0)
          const density = 0.42 + rand() * 0.36
          const G1 = Math.max(4, Math.round(b1 / 0.27))
          const G2 = Math.max(4, Math.round(b2 / 0.27))
          const cw1 = b1 / G1
          const cw2 = b2 / G2
          // a bundle leans toward its own tone, like a shelf of similar books
          const tone = pick()
          for (let gi = 0; gi < G1; gi++)
            for (let gj = 0; gj < G2; gj++) {
              // ragged edges: sparser toward the outside
              const edge = Math.max(Math.abs(gi / (G1 - 1) - 0.5), Math.abs(gj / (G2 - 1) - 0.5)) * 2
              if (rand() > density * (1 - edge * 0.3)) continue
              const ribbon = rand() < 0.12
              const w1 = cw1 * (ribbon ? 1.5 + rand() * 3 : 0.3 + rand() * 0.75)
              const w2 = cw2 * (ribbon ? 0.15 + rand() * 0.25 : 0.3 + rand() * 0.75)
              const o1 = a + (gi + 0.5) * cw1 - b1 / 2 + (rand() - 0.5) * cw1 * 0.6
              const o2 = b + (gj + 0.5) * cw2 - b2 / 2 + (rand() - 0.5) * cw2 * 0.6
              const c = rand() < 0.45 ? tone : pick()
              strand(axis, o1, o2, w1, w2, c, 0.32 + Math.pow(rand(), 1.6) * 1.1)
            }
          // stragglers: loose strands drifting off the bundle
          for (let n = 0; n < 2; n++) {
            const o1 = a + (rand() - 0.5) * (b1 + 2 + rand() * 4)
            const o2 = b + (rand() - 0.5) * (b2 + 2 + rand() * 4)
            const w = 0.02 + rand() * 0.06
            strand(axis, o1, o2, w, w * (0.5 + rand()), pick(), 0.4 + rand() * 0.8)
          }
          // a few strands carry light
          for (let n = 0; n < 3; n++) {
            const t = 0.012 + rand() * 0.02
            const o1 = a + (rand() - 0.5) * b1
            const o2 = b + (rand() - 0.5) * b2
            if (axis === 0) { p.set(0, o1, o2); s.set(L * 2, t, t) }
            else if (axis === 1) { p.set(o1, 0, o2); s.set(t, L * 2, t) }
            else { p.set(o1, o2, 0); s.set(t, t, L * 2) }
            m4.compose(p, q, s)
            const cold = rand() < 0.2
            const c = cold ? new THREE.Color().setRGB(0.45, 0.85, 1.0) : new THREE.Color().setRGB(1.0, 0.82, 0.6)
            const k = 1.0 + rand() * 1.6
            lm.push(...m4.elements)
            lc.push(c.r * k, c.g * k, c.b * k)
          }
        }
      }

  // 2. Lit bookshelf grids where the bundles cross — the room, seen from behind, at every moment.
  const shm: number[] = []
  const shs: number[] = []
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
  for (let n = 0; n < 170; n++) {
    const i = Math.floor(rand() * M)
    const j = Math.floor(rand() * M)
    const k = Math.floor(rand() * M)
    const ax = Math.floor(rand() * 3)
    const dir = rand() < 0.5 ? 1 : -1
    // sit flush on a bundle face next to a junction
    const base = new THREE.Vector3(-L / 2 + i * P, -L / 2 + j * P, -L / 2 + k * P)
    const along = axes[(ax + 1 + Math.floor(rand() * 2)) % 3]
    base.addScaledVector(axes[ax], dir * (B / 2 + 0.03))
    base.addScaledVector(along, (B / 2 + 0.2 + rand() * 2.2) * (rand() < 0.5 ? 1 : -1))
    const nrm = axes[ax].clone().multiplyScalar(dir)
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm)
    const w = 1.8 + rand() * 2.2
    const h = B * (0.7 + rand() * 0.3)
    m4.compose(base, q, s.set(w, h, 1))
    shm.push(...m4.elements)
    shs.push(rand())
    q.identity()
  }

  // 3. Tracks: each kind of thing Thomas keeps or makes runs on its own thread through time.
  //    Inputs ride the upper threads, things he made ride the lower ones.
  // The main tunnel: every moment hangs on one of its four walls — top, right, bottom, left — two lanes
  // per wall, facing in and tilted back toward you, so a full flight shows every picture clearly.
  // Each kind of thing keeps its own wall; its thread (a strand bundle) runs just behind it.
  const WALL = 3.4 // distance of each wall from the path
  const LANE = 1.45 // offset of the two lanes along a wall
  type Slot = { x: number; y: number; nx: number; ny: number }
  const SLOTS: Slot[] = [
    { x: -LANE, y: WALL, nx: 0, ny: -1 }, { x: LANE, y: WALL, nx: 0, ny: -1 }, // top
    { x: WALL, y: LANE, nx: -1, ny: 0 }, { x: WALL, y: -LANE, nx: -1, ny: 0 }, // right
    { x: LANE, y: -WALL, nx: 0, ny: 1 }, { x: -LANE, y: -WALL, nx: 0, ny: 1 }, // bottom
    { x: -WALL, y: -LANE, nx: 1, ny: 0 }, { x: -WALL, y: LANE, nx: 1, ny: 0 }, // left
  ]
  const WALL_OF = [[0, 1], [0, 1], [2, 3], [2, 3], [4, 5], [4, 5], [6, 7], [6, 7]]
  const PREF: Record<string, number[]> = {
    film: [0, 1], pin: [1, 0], seen: [0],
    photo: [2, 3], architecture: [2], object: [3], project: [3], '3d': [3],
    football: [4], science: [5], code: [5], web: [5],
    life: [7], art: [7], play: [6], cooking: [6],
  }
  const prefOf = (it: Item) => PREF[it.medium] ?? (it.kind === 'output' ? [3] : [0])
  const sliceZ = (sl: number) => -(sl + 1) * P
  const path = (t: number) => new THREE.Vector3(Math.sin(t * 0.23) * 0.9 + Math.sin(t * 0.09) * 0.4, Math.sin(t * 0.17 + 1.2) * 0.8, sliceZ(t))
  const moments: Moment[] = []
  const load = new Map<string, number>()
  const perSlot = 2
  for (const item of items) {
    const pref = prefOf(item)
    const wall = WALL_OF[pref[0]]
    const near = [pref[0] + 2, pref[0] - 2, pref[0] + 6, pref[0] + 4].map((x) => ((x % 8) + 8) % 8)
    const order = [...new Set([...pref, ...wall, ...near, 0, 1, 2, 3, 4, 5, 6, 7])]
    let sl = index.get(item.date) ?? 0
    let placed = false
    while (!placed) {
      for (const slot of order) {
        const k = `${slot},${sl}`
        const n = load.get(k) ?? 0
        if (n >= perSlot) continue
        load.set(k, n + 1)
        const a = aspects.get(item.id) ?? 0.75
        const maxS = item.kind === 'output' ? 2.5 : 2.25
        let w = maxS
        let hh = w / a
        if (hh > maxS) { hh = maxS; w = hh * a }
        const S = SLOTS[slot]
        const z = sliceZ(sl) + (n - (perSlot - 1) / 2) * 3.8
        const c = path(sl)
        const pos = new THREE.Vector3(c.x + S.x, c.y + S.y, z)
        // face into the tunnel and back up it, toward you
        const normal = new THREE.Vector3(S.nx * 0.62, S.ny * 0.62, 0.78).normalize()
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)
        const T = SLOTS[pref[0]]
        moments.push({ index: moments.length, item, slice: sl, pos, normal, w, h: hh, track: [T.x - T.nx * 1.4, T.y - T.ny * 1.4], quat, up })
        placed = true
        break
      }
      if (!placed) sl = Math.min(sl + 1, slices.length - 1)
      if (!placed && sl === slices.length - 1 && order.every((x) => (load.get(`${x},${sl}`) ?? 0) >= perSlot)) break
    }
  }

  // each track is its own bundle of strands, coloured by the moments it carries
  const tm: number[] = []
  const tc: number[] = []
  const tlm: number[] = []
  const tlc: number[] = []
  const lines = new Map<string, Moment[]>()
  for (const m of moments) {
    if (isDead(m.item)) continue
    const k = `${m.track[0]},${m.track[1]}`
    if (!lines.has(k)) lines.set(k, [])
    lines.get(k)!.push(m)
  }
  const endZ = sliceZ(slices.length + 2)
  for (const [k, ms] of lines) {
    const [tx, ty] = k.split(',').map(Number)
    ms.sort((a, b) => b.pos.z - a.pos.z)
    const z0 = ms[0].pos.z + P * 1.5
    const tw = 1.4 + rand() * 0.8
    const th = 1.3 + rand() * 0.8
    for (let n = 0; n < 120; n++) {
      const o1 = (rand() - 0.5) * tw
      const o2 = (rand() - 0.5) * th
      const w1 = 0.02 + rand() * rand() * 0.22
      const w2 = 0.02 + rand() * rand() * 0.22
      // a strand starts at one of the track's moments and runs on into the future
      const from = ms[Math.floor(rand() * ms.length)]
      const start = rand() < 0.3 ? z0 : from.pos.z + 1
      const pal = (palettes.get(from.item.id) ?? film).map((c) => warm(c, 0.25))
      const c = pal[Math.floor(rand() * pal.length)]
      const kk = 0.55 + rand() * 0.8
      // some strands of a track stop where a later moment takes over
      const stop = rand() < 0.4 ? ms[Math.floor(rand() * ms.length)].pos.z : endZ
      const len = start - Math.min(stop, start - 4)
      p.set(tx + o1, ty + o2, start - len / 2)
      s.set(w1, w2, len)
      m4.compose(p, q, s)
      tm.push(...m4.elements)
      tc.push(c.r * kk, c.g * kk, c.b * kk)
    }
    // the track's own light
    for (let n = 0; n < 3; n++) {
      p.set(tx + (rand() - 0.5) * B * 0.6, ty + (rand() - 0.5) * B * 0.6, (z0 + endZ) / 2)
      s.set(0.025, 0.025, z0 - endZ)
      m4.compose(p, q, s)
      tlm.push(...m4.elements)
      tlc.push(2.6, 1.9, 1.1)
    }
  }

  const byId = new Map(moments.map((m) => [m.item.id, m.index]))
  const links: { from: number; to: number; strength: number }[] = []
  for (const m of moments)
    for (const src of m.item.influences ?? []) {
      const f = byId.get(src)
      if (f !== undefined && !isDead(moments[f].item) && !isDead(m.item)) links.push({ from: f, to: m.index, strength: 1 })
    }
  // Echoes: for anything Thomas made, the earlier saves whose colours it most resembles.
  const pal = (id: string) => palettes.get(id) ?? []
  const sim = (a: THREE.Color[], b: THREE.Color[]) => {
    if (!a.length || !b.length) return 1e9
    let t = 0
    for (const x of a) {
      let best = 1e9
      for (const y of b) best = Math.min(best, (x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2)
      t += best
    }
    return t / a.length
  }
  for (const m of moments) {
    if (m.item.kind !== 'output' || isDead(m.item)) continue
    const have = new Set(links.filter((l) => l.to === m.index).map((l) => l.from))
    if (have.size) continue
    const cands = moments
      .filter((o) => o.item.kind === 'input' && !isDead(o.item) && o.item.date <= m.item.date && !have.has(o.index))
      .map((o) => ({ o, d: sim(pal(m.item.id), pal(o.item.id)) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 1)
    for (const c of cands) links.push({ from: c.o.index, to: m.index, strength: 0.45 })
  }

  return {
    slices,
    moments,
    strands: { matrices: new Float32Array(sm), colors: new Float32Array(sc), count: sc.length / 3 },
    lights: { matrices: new Float32Array(lm), colors: new Float32Array(lc), count: lc.length / 3 },
    tracks: { matrices: new Float32Array(tm), colors: new Float32Array(tc), count: tc.length / 3 },
    trackLights: { matrices: new Float32Array(tlm), colors: new Float32Array(tlc), count: tlc.length / 3 },
    shelves: { matrices: new Float32Array(shm), seeds: new Float32Array(shs), count: shs.length },
    links,
    path,
    sliceZ,
  }
}

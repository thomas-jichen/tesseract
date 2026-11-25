import * as THREE from 'three'
import type { Item } from './lib/lattice'
import { extractPalette } from './lib/palette'
import { disposePaper, paperize } from './lib/paperize'

export interface Loaded {
  textures: Map<string, THREE.Texture>
  palettes: Map<string, THREE.Color[]>
  aspects: Map<string, number>
  filler: THREE.Texture[]
}

// Empty rooms: warm light falling through a window onto a wall, a few variants.
function fillerTexture(seed: number) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  const base = g.createLinearGradient(0, 0, 0, 256)
  base.addColorStop(0, '#3a2414')
  base.addColorStop(1, '#170d07')
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  const x = 60 + ((seed * 97) % 140)
  const r = g.createRadialGradient(x, 90, 4, x, 110, 180)
  r.addColorStop(0, 'rgba(255,214,160,0.95)')
  r.addColorStop(0.35, 'rgba(214,140,70,0.55)')
  r.addColorStop(1, 'rgba(40,20,10,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 256, 256)
  // window mullions
  g.fillStyle = 'rgba(20,10,5,0.55)'
  g.fillRect(x - 2, 30, 4, 130)
  g.fillRect(x - 46, 92, 92, 4)
  // a bed / desk silhouette line
  g.fillStyle = 'rgba(15,8,4,0.6)'
  g.fillRect(0, 196 + (seed % 3) * 8, 256, 60)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export async function loadAll(items: Item[], onProgress: (p: number) => void, maxAniso: number): Promise<Loaded> {
  const textures = new Map<string, THREE.Texture>()
  const palettes = new Map<string, THREE.Color[]>()
  const aspects = new Map<string, number>()
  const loader = new THREE.TextureLoader()
  let done = 0
  await Promise.all(
    items.map(
      (it) =>
        new Promise<void>((resolve) => {
          loader.load(
            `/items/${it.image}`,
            (t) => {
              t.colorSpace = THREE.SRGBColorSpace
              t.anisotropy = maxAniso
              t.generateMipmaps = true
              t.minFilter = THREE.LinearMipmapLinearFilter
              const img = t.image as HTMLImageElement
              aspects.set(it.id, img.width / img.height)
              try { palettes.set(it.id, extractPalette(img)) } catch { /* cross-origin or decode issue */ }
              textures.set(it.id, t)
              onProgress(++done / items.length)
              resolve()
            },
            undefined,
            () => { onProgress(++done / items.length); resolve() },
          )
        }),
    ),
  )
  // Paper Shaders: print every moment onto paper (sequential — one offscreen mount, reused)
  if (!location.search.includes('nopaper')) {
    let n = 0
    for (const it of items) {
      const t = textures.get(it.id)
      if (!t) continue
      const c = await paperize(t.image as HTMLImageElement, (n++ * 0.6180339) % 1)
      if (!c) continue
      const pt = new THREE.CanvasTexture(c)
      pt.colorSpace = THREE.SRGBColorSpace
      pt.anisotropy = maxAniso
      pt.generateMipmaps = true
      pt.minFilter = THREE.LinearMipmapLinearFilter
      textures.set(it.id, pt)
    }
    disposePaper()
  }
  const filler = [0, 1, 2, 3, 4].map(fillerTexture)
  return { textures, palettes, aspects, filler }
}

import * as THREE from 'three'

// Tiny k-means over a downscaled copy of the image → the item's own colours.
export function extractPalette(img: HTMLImageElement | ImageBitmap, k = 5): THREE.Color[] {
  const S = 28
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img as CanvasImageSource, 0, 0, S, S)
  const d = ctx.getImageData(0, 0, S, S).data
  const px: number[][] = []
  for (let i = 0; i < d.length; i += 4) px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255])
  let cent = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) / k) * px.length)].slice())
  for (let it = 0; it < 8; it++) {
    const sum = cent.map(() => [0, 0, 0, 0])
    for (const p of px) {
      let best = 0
      let bd = 1e9
      cent.forEach((q, ci) => {
        const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
        if (dd < bd) { bd = dd; best = ci }
      })
      const s = sum[best]
      s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++
    }
    cent = cent.map((q, i) => (sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : q))
  }
  return cent.map(([r, g, b]) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace))
}

// Pull a colour toward the tesseract's sepia world without losing its identity.
const SEPIA = new THREE.Color('#8a5a32')
export function warm(c: THREE.Color, amount = 0.35): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 }
  const o = c.clone()
  o.getHSL(hsl)
  o.setHSL(hsl.h, hsl.s * 0.55, Math.min(0.62, Math.max(0.1, hsl.l)))
  return o.lerp(SEPIA, amount)
}

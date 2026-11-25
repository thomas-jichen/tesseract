import { ShaderMount, ShaderFitOptions, getShaderColorFromString, getShaderNoiseTexture, paperTextureFragmentShader } from '@paper-design/shaders'

// Paper Shaders (paper.design): print every moment onto real-feeling paper — fibre, grain, a little
// crumple and a soft fold — once at load. The result is a plain canvas the 3D scene uses as the print.
const SIZE = 640 // css px of the offscreen mount (×DPR)

let mount: ShaderMount | null = null
let host: HTMLDivElement | null = null

async function ready() {
  const noise = getShaderNoiseTexture()
  if (noise && !noise.complete) await new Promise((r) => { noise.onload = r; noise.onerror = r })
  if (!host) {
    host = document.createElement('div')
    // must sit inside the viewport (the mount pauses when offscreen), but invisible and inert
    Object.assign(host.style, { position: 'fixed', left: '0', top: '0', width: `${SIZE}px`, height: `${SIZE}px`, opacity: '0', pointerEvents: 'none', zIndex: '-1' })
    document.body.appendChild(host)
  }
  return noise
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

export async function paperize(img: HTMLImageElement, seed: number): Promise<HTMLCanvasElement | null> {
  try {
    const noise = await ready()
    if (!noise) return null
    const aspect = img.width / img.height
    const r = (k: number) => ((Math.sin(seed * 91.7 + k * 13.1) * 43758.5453) % 1 + 1) % 1
    const uniforms = {
      u_image: img,
      u_isImage: true,
      u_imageAspectRatio: aspect,
      u_colorBack: getShaderColorFromString('rgba(0,0,0,0)'),
      u_colorPaper: getShaderColorFromString('#efe7d6'),
      u_colorShadow: getShaderColorFromString('#2a1c10'),
      u_blending: 0.18,
      u_distortion: 0.05 + r(1) * 0.07,
      u_clip: true,
      u_angle: 60 + r(2) * 60,
      u_seed: seed * 1000,
      u_roughness: 0.32,
      u_roughnessSize: 0.55,
      u_roughnessRows: 0.05,
      u_fiber: 0.32,
      u_fiberSize: 0.45,
      u_folds: r(3) < 0.35 ? 0.25 : 0,
      u_foldSizeX: 0.5,
      u_foldSizeY: 0.5,
      u_foldOffsetX: 0.5,
      u_foldOffsetY: 0.5,
      u_wrinkles: 0.08,
      u_wrinkleSize: 0.5,
      u_crumples: 0.12 + r(4) * 0.12,
      u_crumpleCount: 5 + Math.floor(r(5) * 6),
      u_drops: 0.06,
      u_noiseTexture: noise,
      u_fit: ShaderFitOptions.contain,
      u_scale: 1,
      u_rotation: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_offsetX: 0,
      u_offsetY: 0,
      u_worldWidth: 0,
      u_worldHeight: 0,
    }
    // ShaderMount only binds uniforms it was constructed with, so build it from the first full set
    if (!mount) mount = new ShaderMount(host!, paperTextureFragmentShader, uniforms, { preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true }, 0, 0, 1, 720 * 720)
    else mount.setUniforms(uniforms)
    await frame()
    const src = mount.canvasElement
    // crop the contained image out of the square mount
    const W = src.width
    const H = src.height
    const cw = aspect >= 1 ? W : Math.round(H * aspect)
    const ch = aspect >= 1 ? Math.round(W / aspect) : H
    const out = document.createElement('canvas')
    out.width = cw
    out.height = ch
    out.getContext('2d')!.drawImage(src, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, cw, ch)
    return out
  } catch {
    return null
  }
}

export function disposePaper() {
  mount?.dispose()
  host?.remove()
  mount = null
  host = null
}

import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Line, useGLTF } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import { isDead, type Moment, type Tess } from '../lib/lattice'
import { useStore } from '../lib/store'
import { U, lightStrandMaterial, shelfMaterial, strandMaterial } from './tmaterials'
import { motion } from '../lib/store'

const box = new THREE.BoxGeometry(1, 1, 1)
const quad = new THREE.PlaneGeometry(1, 1)

function useInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, data: { matrices: Float32Array; count: number; colors?: Float32Array; seeds?: Float32Array }) {
  return useMemo(() => {
    const g = data.seeds ? geo.clone() : geo
    if (data.seeds) g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(data.seeds, 1))
    const m = new THREE.InstancedMesh(g, mat, data.count)
    m.instanceMatrix = new THREE.InstancedBufferAttribute(data.matrices, 16)
    if (data.colors) m.instanceColor = new THREE.InstancedBufferAttribute(data.colors, 3)
    m.frustumCulled = false
    return m
  }, [geo, mat, data])
}

export function Lattice({ tess }: { tess: Tess }) {
  const strands = useInstanced(box, useMemo(() => strandMaterial(true), []), tess.strands)
  const lights = useInstanced(box, useMemo(() => lightStrandMaterial(true), []), tess.lights)
  const shelves = useInstanced(quad, useMemo(shelfMaterial, []), tess.shelves)
  const tracks = useInstanced(box, useMemo(() => strandMaterial(false), []), tess.tracks)
  const trackLights = useInstanced(box, useMemo(() => lightStrandMaterial(false), []), tess.trackLights)
  return (
    <>
      <primitive object={strands} />
      <primitive object={lights} />
      <primitive object={shelves} />
      <primitive object={tracks} />
      <primitive object={trackLights} />
    </>
  )
}

const SUIT = `${import.meta.env.BASE_URL}models/astronaut-emu.glb`

// A real EVA suit (NASA EMU) with its own materials, lit by the scene's lights.
function Suit() {
  const { scene } = useGLTF(SUIT)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    // the source file stacks a second copy of some parts on top of the first (z-fighting, a smeared flag texture)
    const DUPES = ['emusuit5_jetpack2sg', 'emusuit5_lambert5sg', 'emusuit5_blinn1sg', 'emusuit5_blinn3sg']
    c.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mname = ((mesh.material as THREE.Material).name || '').toLowerCase()
      if (DUPES.some((d) => mname.includes(d))) { mesh.visible = false; return }
      const upgrade = (src: THREE.Material) => {
        const m = src as THREE.MeshStandardMaterial
        const name = (m.name || '').toLowerCase()
        const col = m.color ?? new THREE.Color(1, 1, 1)
        const goldish = col.r > col.g && col.g > col.b && col.b < 0.2 && col.r > 0.45
        if (name.includes('blinn') && goldish && col.r < 0.72) {
          // the visor: mirror gold
          return new THREE.MeshPhysicalMaterial({ name: m.name, color: new THREE.Color(1.0, 0.76, 0.33), metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2 })
        }
        if (name.includes('blinn')) {
          // fittings, rings, hardware: brushed metal
          return new THREE.MeshPhysicalMaterial({ name: m.name, color: col.clone().lerp(new THREE.Color(0.8, 0.78, 0.74), 0.4), metalness: 0.85, roughness: 0.28, envMapIntensity: 1.4 })
        }
        if (!m.map && col.r > col.g && col.g > col.b && col.r - col.b > 0.2 && !name.includes('lambert4')) {
          // SAFER unit and controls: dark anodised hardware, not muddy plastic
          return new THREE.MeshPhysicalMaterial({ name: m.name, color: new THREE.Color(0.16, 0.16, 0.17), metalness: 0.75, roughness: 0.32, envMapIntensity: 1.2 })
        }
        // layered suit fabric: matte, with a soft cloth sheen at grazing angles
        return new THREE.MeshPhysicalMaterial({
          name: m.name, color: col, map: m.map ?? null, metalness: 0, roughness: 0.82,
          sheen: 0.7, sheenRoughness: 0.75, sheenColor: new THREE.Color(1, 0.97, 0.92), envMapIntensity: 0.7,
        })
      }
      // translucent echoes: you can see the lattice through them, but not their own insides
      const ghost = (mm: THREE.Material) => { mm.transparent = true; mm.opacity = 0.52; mm.depthWrite = true; return mm }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((x) => ghost(upgrade(x))) : ghost(upgrade(mesh.material))
      mesh.renderOrder = 2
    })
    const bb = new THREE.Box3().setFromObject(c)
    const size = bb.getSize(new THREE.Vector3())
    c.position.sub(bb.getCenter(new THREE.Vector3()))
    const w = new THREE.Group()
    w.add(c)
    w.scale.setScalar(2.1 / Math.max(size.x, size.y, size.z))
    return w
  }, [scene])
  return <primitive object={obj} />
}

// Other selves, at other moments — you drift past them.
export function Astronauts({ tess }: { tess: Tess }) {
  const spots = useMemo(() => {
    const out: { p: THREE.Vector3; r: THREE.Euler; s: number; seed: number }[] = []
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    // most drift in the open space around your path (you pass them); a few hang deep in other cells
    const cells = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]
    for (let k = 1.2; k < tess.slices.length + 1; k += 1.6 + rnd() * 1.6) {
      const c = tess.path(k)
      let p: THREE.Vector3
      if (rnd() < 0.72) {
        const side = rnd() < 0.5 ? -1 : 1
        p = new THREE.Vector3(c.x + side * (2.6 + rnd() * 1.0), c.y + (rnd() - 0.5) * 3.6, c.z + (rnd() - 0.5) * 3)
      } else {
        const [ci, cj] = cells[Math.floor(rnd() * cells.length)]
        p = new THREE.Vector3(ci * 11 + (rnd() - 0.5) * 3, cj * 11 + (rnd() - 0.5) * 3, c.z + (rnd() - 0.5) * 3)
      }
      out.push({ p, r: new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28), s: 0.9 + rnd() * 0.4, seed: rnd() })
    }
    ;(window as unknown as { __astro: unknown }).__astro = out
    return out
  }, [tess])
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    spots.forEach((sp, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.set(sp.p.x + Math.sin(t * 0.11 + i) * 0.6, sp.p.y + Math.sin(t * 0.09 + i * 2) * 0.6, sp.p.z)
      g.rotation.set(sp.r.x + t * 0.03 * (sp.seed - 0.5), sp.r.y + t * 0.05 * (sp.seed - 0.3), sp.r.z + Math.sin(t * 0.07 + i) * 0.2)
    })
  })
  return (
    <>
      {spots.map((sp, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} scale={sp.s}>
          <Suspense fallback={null}><Suit /></Suspense>
        </group>
      ))}
    </>
  )
}

function MomentView({ m, texture }: { m: Moment; texture: THREE.Texture }) {
  // a physical print: lit by the room, with a faint glow of its own so it still reads in the dark.
  // Pangram-flagged (AI-made) saves hang dead: grey, cold, unlit, half there.
  const dead = isDead(m.item)
  const mat = useMemo(() => {
    // matte paper: diffuse only, so strip lights and moment lights never glare off the print
    const mm = new THREE.MeshLambertMaterial({
      map: texture, emissiveMap: dead ? null : texture, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: dead ? 0 : 0.3,
      transparent: dead, opacity: dead ? 0.42 : 1, alphaTest: 0.02,
    })
    if (dead)
      mm.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))) * vec3(0.42, 0.44, 0.47);`,
        )
      }
    return mm
  }, [texture, dead])
  const mount = useMemo(
    () => new THREE.MeshLambertMaterial({ color: dead ? '#2a2c2f' : m.item.reviewHuman ? '#e8dcc4' : '#d9cfbd', transparent: dead, opacity: dead ? 0.35 : 1 }),
    [dead, m.item.reviewHuman],
  )
  const q = m.quat
  const behind = useMemo(() => m.pos.clone().addScaledVector(m.normal, -0.025), [m])
  const h = useRef(0)
  useFrame((_, dt) => {
    const st = useStore.getState()
    const t = st.selected === m.index ? 2 : st.hovered === m.index ? 1 : 0
    h.current += (t - h.current) * (1 - Math.exp(-dt * 5))
    mat.emissiveIntensity = dead ? 0 : ((m.item.kind === 'output' ? 0.42 : 0.38) + Math.min(1, h.current) * 0.12) * motion.exposure
  })
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const st = useStore.getState()
    st.setHovered(m.index)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    if (useStore.getState().hovered === m.index) useStore.getState().setHovered(null)
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return // that was a look-around drag
    const st = useStore.getState()
    st.setSelected(st.selected === m.index ? null : m.index)
  }
  return (
    <group>
      <mesh position={behind} quaternion={q} scale={[m.w + 0.14, m.h + 0.14, 1]} geometry={quad} material={mount} />
      <mesh position={m.pos} quaternion={q} scale={[m.w, m.h, 1]} geometry={quad} material={mat} onPointerOver={over} onPointerOut={out} onClick={click} />
    </group>
  )
}

export function Moments({ tess, textures }: { tess: Tess; textures: Map<string, THREE.Texture> }) {
  return (
    <>
      {tess.moments.map((m) => (
        <MomentView key={m.index} m={m} texture={textures.get(m.item.id)!} />
      ))}
    </>
  )
}

// Strings between a moment and what it became: always there, arcing through the open void,
// light running from cause to effect. Touch either end and they tremble.
function Thread({ tess, from, to, strength }: { tess: Tess; from: number; to: number; strength: number }) {
  const A = tess.moments[from]
  const Bm = tess.moments[to]
  const SEG = 96
  const { pts, perp, len } = useMemo(() => {
    const a = A.pos.clone().addScaledVector(A.normal, 0.3)
    const b = Bm.pos.clone().addScaledVector(Bm.normal, 0.3)
    // pull the middle of the string toward the open space you drift through
    const mid = a.clone().lerp(b, 0.5)
    const ctrl = new THREE.Vector3(mid.x * 0.15, mid.y * 0.15 + (strength > 0.7 ? 1.2 : -0.8), mid.z)
    const curve = new THREE.QuadraticBezierCurve3(a, ctrl, b)
    const pts = curve.getPoints(SEG)
    const d = b.clone().sub(a).normalize()
    const p = new THREE.Vector3(0, 1, 0).cross(d)
    return { pts, perp: (p.lengthSq() < 1e-4 ? p.set(1, 0, 0) : p).normalize(), len: curve.getLength() }
  }, [A, Bm, strength])
  const base = useRef<Line2>(null)
  const pulse = useRef<Line2>(null)
  const act = useRef(0)
  const t0 = useRef(0)
  const buf = useMemo(() => new Float32Array((SEG + 1) * 3), [])
  const phase = useMemo(() => Math.random(), [])
  const inited = useRef(false)
  useFrame((state, dt) => {
    const st = useStore.getState()
    const f = st.selected ?? st.hovered
    const on = f === from || f === to ? 1 : 0
    if (on && act.current < 0.05) t0.current = state.clock.elapsedTime
    act.current += (on - act.current) * (1 - Math.exp(-dt * 4))
    const k = act.current
    const t = state.clock.elapsedTime - t0.current
    const amp = k * 0.18 * Math.exp(-t * 1.3) + 0.015
    const still = k < 0.002 && inited.current
    if (!still) for (let i = 0; i <= SEG; i++) {
      const u = i / SEG
      const o = Math.sin(Math.PI * u) * Math.sin(t * 30 + u * 5 + from) * amp
      buf[i * 3] = pts[i].x + perp.x * o
      buf[i * 3 + 1] = pts[i].y + perp.y * o
      buf[i * 3 + 2] = pts[i].z + perp.z * o
    }
    if (!still) {
      base.current?.geometry.setPositions(buf)
      pulse.current?.geometry.setPositions(buf)
      inited.current = true
    }
    const e = U.uExposure.value
    if (base.current) {
      base.current.material.opacity = Math.min(1, 0.35 + strength * 0.6 + k * 0.5) * e
      base.current.material.linewidth = (strength > 0.7 ? 3 : 1.9) + k * 2
    }
    if (pulse.current) {
      pulse.current.material.opacity = Math.min(1, 0.5 + strength * 0.6 + k) * e
      pulse.current.material.linewidth = (strength > 0.7 ? 6.5 : 4) + k * 3
      // light travels from what was saved toward what was made
      pulse.current.material.dashOffset = -(((state.clock.elapsedTime * (0.16 + k * 0.25) + phase) % 1) * len * 1.25)
    }
  })
  const strong = strength > 0.7
  return (
    <>
      <Line ref={base} points={pts} color={strong ? new THREE.Color().setRGB(2.2, 1.15, 0.38) : new THREE.Color().setRGB(1.3, 0.72, 0.28)} lineWidth={1.4} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      <Line ref={pulse} points={pts} color={strong ? new THREE.Color().setRGB(2.6, 1.7, 0.8) : new THREE.Color().setRGB(1.5, 1.0, 0.5)} lineWidth={2.6} transparent opacity={0.8} dashed dashSize={len * 0.12} gapSize={len * 1.1} depthWrite={false} toneMapped={false} />
    </>
  )
}

export function Threads({ tess }: { tess: Tess }) {
  return <>{tess.links.map((l, i) => <Thread key={i} tess={tess} from={l.from} to={l.to} strength={l.strength} />)}</>
}

function ModelInner({ url, m }: { url: string; m: Moment }) {
  const { scene } = useGLTF(url)
  const g = useRef<THREE.Group>(null)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    const bb = new THREE.Box3().setFromObject(c)
    const size = bb.getSize(new THREE.Vector3())
    c.position.sub(bb.getCenter(new THREE.Vector3()))
    const w = new THREE.Group()
    w.add(c)
    w.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z))
    return w
  }, [scene])
  const at = useMemo(() => m.pos.clone().addScaledVector(m.normal, 1.4), [m])
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.22 })
  return (
    <group position={at}>
      <pointLight position={[1.5, 2, 2.5]} intensity={14} color="#ffc48a" distance={10} />
      <pointLight position={[-2, -1, -1.5]} intensity={8} color="#ff9a50" distance={8} />
      <ambientLight intensity={0.12} color="#ffb070" />
      <group ref={g}><primitive object={obj} /></group>
    </group>
  )
}

export function SelectedModel({ tess }: { tess: Tess }) {
  const selected = useStore((s) => s.selected)
  const m = selected !== null ? tess.moments[selected] : null
  if (!m?.item.model) return null
  return (
    <Suspense fallback={null}>
      <ModelInner url={`${import.meta.env.BASE_URL}models/${m.item.model}`} m={m} />
    </Suspense>
  )
}

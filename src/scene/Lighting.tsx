import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { isDead, type Tess } from '../lib/lattice'
import { motion, useStore } from '../lib/store'

const N_LIGHTS = 3

// Studio-like light for a physical set: warm strip lights in the reflections, a warm key,
// and the nearest moments casting their own light onto the strands around them.
export function Lighting({ tess }: { tess: Tess }) {
  const { scene } = useThree()
  const key = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const e = motion.exposure
    scene.environmentIntensity = 1.75 * e
    if (key.current) key.current.intensity = 2.3 * e
    if (hemi.current) hemi.current.intensity = 0.3 * e
    const cam = state.camera.position
    const st = useStore.getState()
    const ranked = tess.moments
      .filter((m) => !isDead(m.item)) // AI-made saves cast no light
      .map((m) => ({ m, d: m.pos.distanceToSquared(cam) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, N_LIGHTS)
    for (let i = 0; i < N_LIGHTS; i++) {
      const l = lights.current[i]
      const r = ranked[i]
      if (!l) continue
      if (!r) { l.intensity = 0; continue }
      tmp.copy(r.m.pos).addScaledVector(r.m.normal, 3.2)
      l.position.lerp(tmp, 0.2)
      const boost = st.selected === r.m.index ? 0.9 : st.hovered === r.m.index ? 1.25 : 1
      l.intensity = (r.m.item.kind === 'output' ? 30 : 24) * boost * e
    }
  })

  return (
    <>
      <Environment frames={1} resolution={256}>
        {/* warm strip lights, like the practical lights rigged around the real set */}
        <Lightformer form="rect" intensity={3} color="#ffd2a0" position={[0, 7, -6]} scale={[14, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ffc488" position={[-7, 1, -2]} scale={[1.2, 10, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffdcb4" position={[6, -2, 4]} scale={[1.6, 8, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#fff1dc" position={[0, 3, 8]} scale={[10, 0.8, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#bcd2ff" position={[8, 6, -8]} scale={[4, 0.5, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#3a2414" position={[0, -8, 0]} scale={[20, 20, 1]} />
        {/* thin, hot strips: the sharp silver glints that run along the strands */}
        <Lightformer form="rect" intensity={9} color="#fff6ea" position={[-3, 8, 2]} scale={[22, 0.12, 1]} />
        <Lightformer form="rect" intensity={7} color="#fff1e0" position={[8, 2, -3]} scale={[0.12, 18, 1]} />
        <Lightformer form="rect" intensity={6} color="#f4f6ff" position={[-6, -3, -7]} scale={[16, 0.1, 1]} />
        <Lightformer form="rect" intensity={5} color="#ffe8cc" position={[2, -6, 6]} scale={[0.1, 14, 1]} />
      </Environment>
      <directionalLight ref={key} position={[-5, 9, 6]} color="#ffe0bc" intensity={1.5} />
      <hemisphereLight ref={hemi} args={['#cbb08a', '#0a0705', 0.22]} />
      {Array.from({ length: N_LIGHTS }, (_, i) => (
        <pointLight key={i} ref={(el) => { lights.current[i] = el }} color="#ffb877" distance={16} decay={2} intensity={0} />
      ))}
    </>
  )
}

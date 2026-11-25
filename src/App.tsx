import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, events } from '@react-three/fiber'
import rawItems from './data/items.json'
import { buildTesseract, type Item, type Tess } from './lib/lattice'
import { loadAll, type Loaded } from './loader'
import { useStore } from './lib/store'
import { Astronauts, Lattice, Moments, SelectedModel, Threads } from './scene/Tess'
import { Lighting } from './scene/Lighting'
import { TessRig } from './scene/TessRig'
import { Effects, fisheye } from './scene/Effects'

const items = rawItems as Item[]

export default function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    loadAll(items, useStore.getState().setProgress, 8).then(setLoaded)
  }, [])

  const tess: Tess | null = useMemo(() => {
    if (!loaded) return null
    const ok = items.filter((i) => loaded.textures.has(i.id))
    return buildTesseract(ok, loaded.palettes, loaded.aspects)
  }, [loaded])

  return (
    <>
      <Canvas
        className="stage"
        dpr={[1, 1.35]}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping, stencil: false }}
        camera={{ fov: 78, near: 0.5, far: 120 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#060403')
          scene.fog = new THREE.FogExp2('#060403', 0.024)
        }}
        onPointerMissed={(e) => { if (e.type === 'click') useStore.getState().setSelected(null) }}
        events={(store) => ({
          ...events(store),
          // pick through the same fisheye the frame is drawn with
          compute: (event, state) => {
            const w = state.size.width
            const h = state.size.height
            const aspect = w / h
            const k = (fisheye.uniforms.get('strength') as THREE.Uniform).value as number
            const u = event.offsetX / w - 0.5
            const v = 0.5 - event.offsetY / h
            const r2 = (u * aspect) ** 2 + v ** 2
            const rmax = (aspect * 0.5) ** 2 + 0.25
            const f = (1 + k * r2) / (1 + k * rmax)
            state.pointer.set(u * f * 2, v * f * 2)
            state.raycaster.setFromCamera(state.pointer, state.camera)
          },
        })}
      >
        {tess && loaded && (
          <>
            <TessRig tess={tess} />
            <Lighting tess={tess} />
            <Lattice tess={tess} />
            <Moments tess={tess} textures={loaded.textures} />
            <Threads tess={tess} />
            <Astronauts tess={tess} />
            <SelectedModel tess={tess} />
          </>
        )}
        {!location.search.includes('nofx') && <Effects />}
      </Canvas>
      <div id="fold" className="fold" />
    </>
  )
}

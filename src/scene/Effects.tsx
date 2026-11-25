import type React from 'react'
import { Bloom, ChromaticAberration, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, Effect, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'

// A gentle fisheye: magnify the centre, compress the edges, keep the corners pinned — see more of the lattice at once.
class FisheyeEffect extends Effect {
  constructor() {
    super(
      'Fisheye',
      /* glsl */ `
        uniform float strength;
        void mainUv(inout vec2 uv) {
          vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
          float r2 = dot(c, c);
          vec2 cm = vec2(aspect * 0.5, 0.5);
          float rmax = dot(cm, cm);
          float f = (1.0 + strength * r2) / (1.0 + strength * rmax);
          uv = 0.5 + (uv - 0.5) * f;
        }
      `,
      { uniforms: new Map([['strength', new THREE.Uniform(0.08)]]) },
    )
  }
}
export const fisheye = new FisheyeEffect()

const ca = new THREE.Vector2(0.0005, 0.0003)
const q = new URLSearchParams(location.search).get('fx') ?? 'afbctnv'

export function Effects() {
  const fx = [
    q.includes('a') && <N8AO key="a" aoRadius={1.4} intensity={2.4} distanceFalloff={1.2} halfRes quality="performance" color="#050302" />,
    q.includes('f') && <primitive key="f" object={fisheye} />,
    q.includes('b') && <Bloom key="b" mipmapBlur intensity={0.38} luminanceThreshold={0.82} luminanceSmoothing={0.2} radius={0.55} />,
    q.includes('c') && <ChromaticAberration key="c" offset={ca} radialModulation modulationOffset={0.35} />,
    q.includes('t') && <ToneMapping key="t" mode={ToneMappingMode.ACES_FILMIC} />,
    q.includes('n') && <Noise key="n" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.15} />,
    q.includes('v') && <Vignette key="v" offset={0.3} darkness={0.62} />,
    q.includes('a') && <SMAA key="s" />,
  ].filter(Boolean) as React.ReactElement[]
  // N8AO needs a non-multisampled depth buffer; SMAA handles edges instead
  return <EffectComposer multisampling={q.includes('a') ? 0 : 4}>{fx}</EffectComposer>
}

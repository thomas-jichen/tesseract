import * as THREE from 'three'
import { L } from '../lib/lattice'

export const NL = 6

export const U = {
  uCam: { value: new THREE.Vector3() },
  uL: { value: L },
  uTime: { value: 0 },
  uExposure: { value: 0 },
  uKey: { value: new THREE.Vector3(-0.45, 0.78, 0.42).normalize() },
  uKeyColor: { value: new THREE.Color().setRGB(1.0, 0.92, 0.8) },
  uLights: { value: Array.from({ length: NL }, () => new THREE.Vector4(0, 0, 1e5, 0)) },
  uWarm: { value: new THREE.Color().setRGB(1.0, 0.66, 0.38) },
  uFar: { value: L * 0.48 },
}

const common = /* glsl */ `
  uniform vec3 uCam; uniform float uL; uniform float uTime; uniform float uExposure; uniform vec3 uKey;
  uniform vec4 uLights[${NL}]; uniform vec3 uWarm; uniform float uFar; uniform float uWrap; uniform vec3 uKeyColor;
  float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
  vec3 safe(vec3 c){ return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : clamp(c, 0.0, 48.0); }
  float darkness(float d){ return (0.15 + 0.85*exp(-d*d*0.0004)) * smoothstep(uFar, uFar*0.55, d); }
  float glowFar(float d){ return 0.35 + 0.65*exp(-d*0.018); }
  vec3 warmLight(vec3 p, vec3 n){
    vec3 acc = vec3(0.0);
    for(int i=0;i<${NL};i++){
      vec3 Lv = uLights[i].xyz - p; float d2 = dot(Lv,Lv);
      acc += uLights[i].w * (0.2 + 0.8*max(dot(n, Lv*inversesqrt(d2)),0.0)) / (1.0 + d2*0.12);
    }
    return acc * uWarm;
  }
`
// world position of an instance, wrapped so the tile always surrounds the camera
const WRAP = /* glsl */ `
  vec3 ic = (modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
  vec3 isc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 ref = ic;
  #ifdef LINEWRAP
  // strands wrap along their length as a whole line (their break pattern is L-periodic)
  if (isc.x > isc.y && isc.x > isc.z) ref.x = 0.0;
  else if (isc.y > isc.z) ref.y = 0.0;
  else ref.z = 0.0;
  #endif
  vec3 shift = uL * floor((uCam - ref) / uL + 0.5) * uWrap;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0) + vec4(shift, 0.0);
`

// Strands as physical material: glossy lacquer, paper and metal, lit by real lights and a studio environment.
// The infinite tiling is injected into three's standard shader so reflections, fog and AO all still work.
export function strandMaterial(wrap = true) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.5, envMapIntensity: 1.0 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCam = U.uCam
    shader.uniforms.uL = U.uL
    shader.uniforms.uFar = U.uFar
    shader.uniforms.uWrap = { value: wrap ? 1 : 0 }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uCam; uniform float uL; uniform float uWrap;
        varying float vSeedS; varying float vAlongS;
        float hashS(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }`,
      )
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4( transformed, 1.0 );
        vec3 shiftW = vec3(0.0);
        #ifdef USE_INSTANCING
          vec3 icW = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 iscW = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vec3 refW = icW;
          if (iscW.x > iscW.y && iscW.x > iscW.z) refW.x = 0.0; else if (iscW.y > iscW.z) refW.y = 0.0; else refW.z = 0.0;
          shiftW = uL * floor((uCam - refW) / uL + 0.5) * uWrap;
          mvPosition = instanceMatrix * mvPosition;
          mvPosition.xyz += shiftW;
          vSeedS = hashS(icW);
          vAlongS = iscW.x > iscW.y && iscW.x > iscW.z ? mvPosition.x : (iscW.y > iscW.z ? mvPosition.y : mvPosition.z);
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
          vec4 worldPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            worldPosition = instanceMatrix * worldPosition;
            worldPosition.xyz += shiftW;
          #endif
          worldPosition = modelMatrix * worldPosition;
        #endif`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uFar; varying float vSeedS; varying float vAlongS;
        bool metalS(){ return fract(vSeedS*7.31) < 0.36; }`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // printed / extruded surfaces: slow tonal variation along the length
        diffuseColor.rgb *= 0.86 + 0.1*sin(vAlongS*0.13 + vSeedS*31.0) + 0.06*sin(vAlongS*0.041 + vSeedS*7.0);
        // metal strands lean silver, like the set's chrome-faced strips
        if (metalS()) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.84, 0.8), 0.55);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = metalS()
          ? clamp(0.05 + fract(vSeedS*13.7)*0.22 + 0.03*sin(vAlongS*0.09 + vSeedS*5.0), 0.04, 0.3)
          : clamp(roughness * (0.28 + vSeedS*1.1) + 0.05*sin(vAlongS*0.07 + vSeedS*9.0), 0.1, 0.75);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `float metalnessFactor = metalS() ? 0.95 : 0.04;`,
      )
      .replace(
        '#include <fog_fragment>',
        `#ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
          #else
            float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
          #endif
          // the tile seam always sits in darkness
          fogFactor = max(fogFactor, smoothstep(uFar * 0.62, uFar, vFogDepth));
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
        #endif`,
      )
  }
  return m
}

export function lightStrandMaterial(wrap = true) {
  return new THREE.ShaderMaterial({
    defines: { LINEWRAP: '' },
    uniforms: { ...U, uWrap: { value: wrap ? 1 : 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${common}
      varying vec3 vW; varying vec3 vC; varying float vAlong; varying float vSeed;
      void main(){
        ${WRAP}
        vW = wp.xyz; vC = instanceColor; vSeed = hash(ic);
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vAlong = sc.x > sc.y && sc.x > sc.z ? wp.x : (sc.y > sc.z ? wp.y : wp.z);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${common}
      varying vec3 vW; varying vec3 vC; varying float vAlong; varying float vSeed;
      void main(){
        float d = length(vW - uCam);
        float run = 0.15 + 0.85*pow(0.5 + 0.5*sin(vAlong*0.09 - uTime*(0.4 + vSeed) + vSeed*40.0), 10.0);
        vec3 col = vC * run * 0.6 * darkness(d) * smoothstep(0.6, 3.0, d);
        gl_FragColor = vec4(safe(col * uExposure), 1.0);
      }`,
  })
}

// The bookshelf seen from behind: a grid of book-backs, lit from the room.
export function shelfMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uWrap: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      ${common}
      attribute float aSeed;
      varying vec2 vUv; varying float vD; varying float vS;
      void main(){
        ${WRAP}
        vUv = uv; vS = aSeed; vD = length(wp.xyz - uCam);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${common}
      varying vec2 vUv; varying float vD; varying float vS;
      void main(){
        float rows = 4.0 + floor(vS*4.0);
        float cols = 9.0 + floor(vS*9.0);
        vec2 g = vUv * vec2(cols, rows);
        vec2 id = floor(g); vec2 f = fract(g);
        float r = hash2(id + vS*10.0);
        float book = step(0.08, f.x) * step(f.x, 0.92 - r*0.25) * step(0.06, f.y) * step(f.y, 0.62 + r*0.32);
        float lit = r > 0.32 ? 1.0 : 0.15;
        vec3 tint = mix(vec3(1.0,0.62,0.32), vec3(1.0,0.9,0.75), hash2(id*1.7));
        if (hash2(id*3.1 + 2.0) > 0.86) tint = vec3(0.85, 0.22, 0.12);
        float flick = 0.94 + 0.06*sin(uTime*(0.5+r*1.1) + r*30.0);
        vec2 e = abs(vUv - 0.5) * 2.0;
        float edge = 1.0 - smoothstep(0.82, 1.0, max(e.x, e.y));
        vec3 col = tint * book * lit * flick * 1.3 * edge;
        col += vec3(1.0,0.66,0.38) * 0.05 * edge;
        gl_FragColor = vec4(safe(col * darkness(vD) * uExposure), 1.0);
      }`,
  })
}

export function momentMaterial(map: THREE.Texture, seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uWrap: { value: 0 }, map: { value: map }, uBright: { value: 1 }, uFocus: { value: 0 }, uSeed: { value: seed } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vD; varying vec3 vW;
      void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${common}
      uniform sampler2D map; uniform float uBright; uniform float uFocus; uniform float uSeed;
      varying vec2 vUv; varying vec3 vW;
      void main(){
        float d = length(vW - uCam);
        vec2 uv = vUv;
        // a breath of temporal smear, like the room seen across time
        float sm = (1.0 - uFocus) * 0.006;
        vec3 c = texture2D(map, uv).rgb * 0.5 + texture2D(map, uv + vec2(sm, 0.0)).rgb * 0.25 + texture2D(map, uv - vec2(sm, 0.0)).rgb * 0.25;
        float l = dot(c, vec3(0.2126,0.7152,0.0722));
        vec3 tone = vec3(l) * vec3(1.08, 0.98, 0.86);
        vec3 graded = mix(tone, c, 0.5 + 0.48*uFocus) * 0.94 + vec3(0.022,0.016,0.01);
        vec2 q = uv - 0.5;
        float vig = smoothstep(0.8, 0.15, length(q));
        float flick = 0.97 + 0.03*sin(uTime*(0.7+uSeed) + uSeed*20.0);
        float grain = (hash2(uv*vec2(613.0,571.0)) - 0.5) * 0.03;
        vec3 col = graded * mix(0.45, 1.0, vig) * flick * uBright + grain;
        gl_FragColor = vec4(safe(col * glowFar(d) * uExposure), 1.0);
      }`,
  })
}

export function astroMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uWrap: { value: 0 }, uGhost: { value: 0.5 } },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${common}
      uniform float uGhost; varying vec3 vN; varying vec3 vW;
      void main(){
        float d = length(vW - uCam);
        vec3 n = normalize(vN); vec3 V = (uCam - vW) / d;
        if (!gl_FrontFacing) n = -n;
        float diff = 0.2 + 0.8*max(dot(n, uKey), 0.0);
        float wrapL = 0.5 + 0.5*dot(n, uKey);
        float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        float spec = pow(max(dot(n, normalize(uKey + V)), 0.0), 40.0);
        vec3 suit = vec3(0.88, 0.84, 0.76);
        vec3 col = suit * (diff * 0.75 + wrapL * 0.2) + uKeyColor * spec * 0.55 + uWarm * rim * 0.55 + suit * warmLight(vW, n) * 0.8;
        // far selves sink into the dark rather than vanishing
        col *= mix(1.0, 0.25, uGhost);
        gl_FragColor = vec4(safe(col * glowFar(d) * uExposure), 1.0);
      }`,
  })
}

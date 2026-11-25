import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import type { Tess } from '../lib/lattice'
import { P } from '../lib/lattice'
import { motion, useStore } from '../lib/store'
import { NL, U } from './tmaterials'
import { fisheye } from './Effects'

const FOV = 78 // wide, with only a whisper of lens curvature
const FOCUS_FOV = 58
const MAX_ZOOM = 1.45 // widest view the zoom allows

// Weightless. Scroll: through time. Drag: look around. Pinch / ⌘-scroll / +−: zoom. Shift-drag or two-finger swipe: slide through the lattice.
export function TessRig({ tess }: { tess: Tess }) {
  const { camera, gl } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const N = tess.slices.length
  const minT = 0.3
  const maxT = N - 2
  const ctl = useRef({
    mode: 'none' as 'none' | 'look' | 'slide',
    x: 0, y: 0, moved: 0,
    yaw: 0, pitch: 0, yawV: 0, pitchV: 0,
    zoom: MAX_ZOOM, zoomT: MAX_ZOOM, // start all the way zoomed out
    off: new THREE.Vector3(), vel: new THREE.Vector3(),
  })
  const sm = useRef({ px: 0, py: 0 })
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), up: new THREE.Vector3(0, 1, 0), right: new THREE.Vector3(), camUp: new THREE.Vector3() }), [])
  const lastSel = useRef<number | null>(null)

  useEffect(() => {
    ;(window as unknown as { __dbg: unknown }).__dbg = { motion, U, tess, ctl, store: useStore }
    const el = gl.domElement
    const c = ctl.current
    const advance = (dv: number) => {
      if (useStore.getState().demo) return
      const st = useStore.getState()
      if (st.phase === 'fold') return
      if (st.selected !== null) { st.setSelected(null); return }
      motion.target += dv
      if (motion.target > maxT) {
        motion.overscroll += motion.target - maxT
        motion.target = maxT
        if (motion.overscroll > 1.6) fold()
      } else motion.overscroll = Math.max(0, motion.overscroll - 0.02)
      motion.target = Math.max(minT, motion.target)
    }
    const zoomBy = (f: number) => { c.zoomT = THREE.MathUtils.clamp(c.zoomT * f, 0.3, MAX_ZOOM) }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey || e.altKey) { zoomBy(Math.exp(e.deltaY * 0.006)); return } // pinch on trackpads arrives as ctrl+wheel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
        c.vel.addScaledVector(tmp.right, e.deltaX * 0.012)
        return
      }
      advance(THREE.MathUtils.clamp(e.deltaY, -120, 120) * 0.0068)
    }
    const onDown = (e: PointerEvent) => {
      c.mode = e.shiftKey || e.button === 2 ? 'slide' : 'look'
      c.x = e.clientX
      c.y = e.clientY
      c.moved = 0
    }
    const onMove = (e: PointerEvent) => {
      motion.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      motion.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
      if (c.mode === 'none') return
      const dx = e.clientX - c.x
      const dy = e.clientY - c.y
      c.x = e.clientX
      c.y = e.clientY
      c.moved += Math.abs(dx) + Math.abs(dy)
      if (c.mode === 'look') {
        c.yawV += -dx * 0.0032 * c.zoom
        c.pitchV += -dy * 0.0028 * c.zoom
      } else {
        c.vel.addScaledVector(tmp.right, -dx * 0.02).addScaledVector(tmp.camUp, dy * 0.02)
      }
      if (c.moved > 6) document.body.style.cursor = 'grabbing'
    }
    const onUp = () => { c.mode = 'none'; if (document.body.style.cursor === 'grabbing') document.body.style.cursor = '' }
    // touch: one finger looks, vertical swipe travels, pinch zooms
    let t1: { x: number; y: number } | null = null
    let pinch = 0
    const onTS = (e: TouchEvent) => {
      if (e.touches.length === 1) t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    }
    const onTM = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        if (pinch) zoomBy(pinch / d)
        pinch = d
        return
      }
      if (!t1) return
      const x = e.touches[0].clientX
      const y = e.touches[0].clientY
      advance((t1.y - y) * 0.016)
      c.yawV += -(x - t1.x) * 0.003
      t1 = { x, y }
    }
    const onKey = (e: KeyboardEvent) => {
      // Space: start the 2:00 fly-through, then pause / play it
      if (e.key === ' ') {
        e.preventDefault()
        const st = useStore.getState()
        if (!st.demo) st.setDemo(true)
        else st.setPaused(!st.paused)
        return
      }
      if (['ArrowDown', 'PageDown', 'w', 'W'].includes(e.key)) { e.preventDefault(); advance(1) }
      if (['ArrowUp', 'PageUp', 's', 'S'].includes(e.key)) { e.preventDefault(); advance(-1) }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') c.yawV += 0.12
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') c.yawV -= 0.12
      if (e.key === '+' || e.key === '=') zoomBy(0.85)
      if (e.key === '-' || e.key === '_') zoomBy(1.18)
      if (e.key === 'Escape') { useStore.getState().setSelected(null); useStore.getState().setDemo(false) }
    }
    const noMenu = (e: MouseEvent) => e.preventDefault()
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('contextmenu', noMenu)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: true })
    window.addEventListener('keydown', onKey)

    // fall in from the dark
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    motion.t = reduce ? minT : minT - 4
    motion.target = minT
    motion.exposure = 0
    motion.intro = reduce ? 1 : 0
    const tl = gsap.timeline()
    tl.to(motion, { exposure: 1, duration: reduce ? 1 : 4.5, ease: 'power2.inOut' }, 0.3)
    tl.to(motion, { intro: 1, duration: 7, ease: 'power3.out' }, 0)
    useStore.getState().setPhase('drift')

    if (location.search.includes('cinema')) setTimeout(() => useStore.getState().setDemo(true), 400)
    return () => {
      tl.kill()
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('contextmenu', noMenu)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('touchstart', onTS)
      el.removeEventListener('touchmove', onTM)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, maxT, tess, tmp])

  // The 2:00 fly-through: fall in → the gauntlet → Framed (old Pudong → the Pearl Tower) → the TerragentX win → the fold.
  const demo = useStore((s) => s.demo)
  const paused = useStore((s) => s.paused)
  const demoTl = useRef<gsap.core.Timeline | null>(null)
  useEffect(() => {
    if (!demo) return
    const st = useStore.getState()
    const find = (id: string, fallback: number) => tess.moments.find((m) => m.item.id === id) ?? tess.moments[fallback]
    const stops = [
      find('new:IMG_1548', 0), // gauntlet, worn — sketch → armour → sensors → this
      find('new:DSC_1380', 1), // Framed — old Pudong → every Pearl Tower shot
      find('new:IMG_9761', tess.moments.length - 1), // overall winner — bulldog → logo → shady.Hacks → this
    ]
    const c = ctl.current
    c.off.set(0, 0, 0)
    c.yaw = c.pitch = 0
    st.setSelected(null)
    st.setHovered(null)
    document.body.style.cursor = 'none'
    motion.overscroll = 0
    motion.t = minT - 4
    motion.target = minT
    motion.intro = 0
    motion.exposure = 0
    const tl = gsap.timeline({ onComplete: () => { useStore.getState().setDemo(false); document.body.style.cursor = '' } })
    demoTl.current = tl
    tl.to(motion, { exposure: 1, duration: 4.5, ease: 'power2.inOut' }, 0.3)
    tl.to(motion, { intro: 1, duration: 7, ease: 'power3.out' }, 0)
    const at = [[6, 28], [43, 19], [71, 25]] // [start, travel seconds] for each stop
    stops.forEach((m, i) => {
      const [t0, dur] = at[i]
      const arrive = t0 + dur
      tl.to(motion, { target: Math.max(minT, m.slice - 1.4), duration: dur, ease: 'sine.inOut' }, t0)
      tl.add(() => st.setHovered(m.index), arrive)
      tl.add(() => st.setSelected(m.index), arrive + 1.5)
      tl.add(() => { st.setSelected(null); st.setHovered(null) }, arrive + 8)
    })
    tl.to(motion, { target: maxT, duration: 11, ease: 'sine.in' }, 105)
    tl.add(() => { motion.overscroll = 99; fold() }, 116)
    tl.add(() => {}, 121)
    return () => { tl.kill(); demoTl.current = null; document.body.style.cursor = '' }
  }, [demo, tess, maxT])
  // pause holds the fly-through where it is (the camera keeps its weightless drift)
  useEffect(() => {
    const tl = demoTl.current
    if (!tl) return
    if (paused) { tl.pause(); document.body.style.cursor = '' } else { tl.resume(); document.body.style.cursor = 'none' }
  }, [paused])

  const selected = useStore((s) => s.selected)
  useEffect(() => {
    const tw = gsap.to(motion, { look: selected !== null ? 1 : 0, duration: selected !== null ? 1.8 : 1.3, ease: 'power3.inOut' })
    return () => { tw.kill() }
  }, [selected])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const t = state.clock.elapsedTime
    U.uTime.value = t
    const c = ctl.current

    const prev = motion.t
    motion.t += (motion.target - motion.t) * (1 - Math.exp(-dt * 2.4))
    motion.velocity = (motion.t - prev) / Math.max(dt, 1e-3)

    // look-around with inertia; it stays where you leave it
    c.yaw += c.yawV
    c.pitch = THREE.MathUtils.clamp(c.pitch + c.pitchV, -1.35, 1.35)
    c.yawV *= Math.exp(-dt * 7)
    c.pitchV *= Math.exp(-dt * 7)
    c.zoom += (c.zoomT - c.zoom) * (1 - Math.exp(-dt * 5))

    // slide: inertial, slowly returning to the thread of time
    c.off.addScaledVector(c.vel, 1)
    c.vel.multiplyScalar(Math.exp(-dt * 3.2))
    if (c.mode !== 'slide') c.off.multiplyScalar(Math.exp(-dt * 0.08))
    c.off.clampLength(0, P * 4)

    const s = sm.current
    s.px += (motion.pointer.x - s.px) * (1 - Math.exp(-dt * 1.4))
    s.py += (motion.pointer.y - s.py) * (1 - Math.exp(-dt * 1.4))

    const pos = tess.path(motion.t).add(c.off)
    pos.x += Math.sin(t * 0.17) * 0.4
    pos.y += Math.sin(t * 0.13 + 1) * 0.4
    const ahead = tess.path(motion.t + 1.4).add(c.off)
    tmp.m.lookAt(pos, ahead, tmp.up)
    tmp.q.setFromRotationMatrix(tmp.m)
    const fall = 1 - motion.intro
    const parallax = c.mode === 'look' ? 0 : 1
    // never look straight down the time axis: a slow weightless sweep across the cells
    tmp.e.set(
      -0.14 + Math.sin(t * 0.023 + 0.4) * 0.12 + s.py * 0.08 * parallax + c.pitch - fall * 0.5,
      0.4 * Math.sin(t * 0.031 + 0.9) - s.px * 0.1 * parallax + c.yaw,
      0.22 * Math.sin(t * 0.019 + 1.0) + 0.12 + THREE.MathUtils.clamp(motion.velocity, -3, 3) * 0.03 + fall * 1.1,
    )
    tmp.q2.setFromEuler(tmp.e)
    tmp.q.multiply(tmp.q2)

    const st = useStore.getState()
    if (st.selected !== null) lastSel.current = st.selected
    else if (motion.look < 0.001) lastSel.current = null
    let focusNear = 0.5
    if (lastSel.current !== null && motion.look > 0) {
      const m = tess.moments[lastSel.current]
      const span = Math.max(m.h, m.w / cam.aspect)
      const dist = (span / 2 / Math.tan(THREE.MathUtils.degToRad(FOCUS_FOV / 2))) * 1.35
      const eye = m.pos.clone().addScaledVector(m.normal, dist)
      eye.x += s.px * 0.15
      eye.y += s.py * 0.12
      const qq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, m.pos, m.up))
      pos.lerp(eye, motion.look)
      tmp.q.slerp(qq, motion.look)
      // nothing stands between you and the moment you're looking at
      focusNear = THREE.MathUtils.lerp(0.5, Math.max(0.5, dist - 0.9), motion.look * motion.look)
    }
    cam.position.copy(pos)
    cam.quaternion.copy(tmp.q)
    const wide = THREE.MathUtils.clamp((FOV + fall * 18 + Math.min(Math.abs(motion.velocity) * 3, 8)) * c.zoom, 25, 135)
    cam.fov = THREE.MathUtils.lerp(wide, FOCUS_FOV, motion.look)
    cam.near = focusNear
    ;(fisheye.uniforms.get('strength') as THREE.Uniform).value = 0.08 * (1 - motion.look) * THREE.MathUtils.clamp(cam.fov / FOV, 0.3, 1.2)
    cam.updateProjectionMatrix()
    tmp.right.set(1, 0, 0).applyQuaternion(cam.quaternion)
    tmp.camUp.set(0, 1, 0).applyQuaternion(cam.quaternion)

    U.uCam.value.copy(cam.position)
    U.uExposure.value = motion.exposure

    const ranked = tess.moments.map((m) => ({ m, d: m.pos.distanceToSquared(cam.position) })).sort((a, b) => a.d - b.d)
    for (let i = 0; i < NL; i++) {
      const v = U.uLights.value[i]
      const r = ranked[i]
      if (!r) { v.set(0, 0, 1e5, 0); continue }
      const p = r.m.pos.clone().addScaledVector(r.m.normal, 0.6)
      const boost = st.hovered === r.m.index ? 1.8 : st.selected === r.m.index ? 2.2 : 1
      v.set(p.x, p.y, p.z, (r.m.item.kind === 'output' ? 1.5 : 1) * boost)
    }
  })

  function fold() {
    const st = useStore.getState()
    if (st.phase === 'fold') return
    st.setPhase('fold')
    const overlay = document.getElementById('fold')
    const tl = gsap.timeline()
    tl.to(motion, { target: N + 1, duration: 3, ease: 'power3.in' }, 0)
    tl.to(motion, { exposure: 3, duration: 3, ease: 'power2.in' }, 0)
    if (overlay) tl.to(overlay, { opacity: 1, duration: 1.6, ease: 'power2.in' }, 1.4)
    tl.add(() => {
      motion.t = minT - 4
      motion.target = minT
      motion.intro = 0
      motion.overscroll = 0
      motion.exposure = 0
      st.setPhase('drift')
      gsap.to(motion, { intro: 1, duration: 7, ease: 'power3.out' })
      gsap.to(motion, { exposure: 1, duration: 4.5, ease: 'power2.inOut', delay: 0.6 })
    })
    if (overlay) tl.to(overlay, { opacity: 0, duration: 2.4, ease: 'power2.out' }, '+=0.3')
  }

  return null
}

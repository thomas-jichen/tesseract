import { create } from 'zustand'

type Phase = 'loading' | 'ready' | 'intro' | 'drift' | 'fold'

interface State {
  phase: Phase
  progress: number
  hovered: number | null // room index
  selected: number | null
  sound: boolean
  label: string // current month label
  isNow: boolean
  setPhase: (p: Phase) => void
  setProgress: (n: number) => void
  setHovered: (i: number | null) => void
  setSelected: (i: number | null) => void
  setSound: (b: boolean) => void
  setLabel: (s: string, now: boolean) => void
}

export const useStore = create<State>((set) => ({
  phase: 'loading',
  progress: 0,
  hovered: null,
  selected: null,
  sound: true,
  label: '',
  isNow: false,
  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setHovered: (hovered) => set({ hovered }),
  setSelected: (selected) => set({ selected }),
  setSound: (sound) => set({ sound }),
  setLabel: (label, isNow) => set((s) => (s.label === label && s.isNow === isNow ? s : { label, isNow })),
}))

// Mutable, per-frame values shared between the camera rig and shaders (no React re-renders).
export const motion = {
  t: 0, // current time (slices)
  target: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  look: 0, // 0 = corridor, 1 = looking through a room
  intro: 0, // 0..1
  exposure: 0,
  overscroll: 0,
}

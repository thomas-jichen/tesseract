// World layout. Time runs down -Z. The corridor is the empty column (i = 0, |j| <= 1).
export const SLICE = 3.0 // world units per time slice (one month)
export const CW = 4.2 // lattice cell width  (x)
export const CH = 2.8 // lattice cell height (y)
export const NX = 4 // cells on each side of the corridor (x)
export const NY = 4 // cells above / below (y)
export const CORRIDOR_J = 1 // |j| <= this is open corridor in column 0
export const ROWS = 4 // shelf rows per cell
export const LEAD_SLICES = 1 // a breath of lattice before the first moment
export const FUTURE_SLICES = 12 // lattice that continues past "now"
export const MAX_GAP = 3 // long empty stretches of time fold down to this many slices
export const NOW = '2026-11'
export const NAME = 'Thomas Wang'

export const FOG = '#0d0805'
export const FOG_DENSITY = 0.034
export const ROOM_LIGHT = [1.0, 0.62, 0.3] as const

// Muted, warm "book" colours used before a face has absorbed anything.
export const BOOKS = [
  '#4a2418', '#7b4a24', '#a8763f', '#cfb184', '#3a2c25', '#663427', '#2c3434',
  '#6f5f45', '#8f3a26', '#bf9a5e', '#23293a', '#ddc9a0', '#54402c', '#94613a',
]

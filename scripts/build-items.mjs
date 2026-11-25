// Generates src/data/items.json from local assets. Edit the MADE + LINKS tables, then: node scripts/build-items.mjs
import { readdirSync, writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { NEW, NEW_LINKS } from './manifest.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NOW_MONTH = new Date().toISOString().slice(0, 7)

// Letterboxd diary (tjwang): slug, title, watched (YYYY-MM), rating /10
const FILMS = `chef|Chef|2026-05|8
now-you-see-me|Now You See Me|2026-05|8
rush-hour-2|Rush Hour 2|2026-04|6
detective-chinatown-1900|Detective Chinatown 1900|2026-04|10
goodbye-mr-loser|Goodbye Mr. Loser|2026-04|9
the-shawshank-redemption|The Shawshank Redemption|2026-04|8
transformers|Transformers|2026-04|8
the-shadows-edge-2025|The Shadow’s Edge|2026-04|5
fantastic-four-2005|Fantastic Four|2026-04|8
the-godfather-part-ii|The Godfather Part II|2026-04|6
project-hail-mary|Project Hail Mary|2026-04|7
crazy-rich-asians|Crazy Rich Asians|2026-03|8
avengers-endgame|Avengers: Endgame|2026-03|10
the-dark-knight|The Dark Knight|2026-03|10
marty-supreme|Marty Supreme|2026-03|8
evangelion-10-you-are-not-alone|Evangelion: 1.0 You Are (Not) Alone|2026-03|7
iron-man-2008|Iron Man|2026-03|9
dont-look-up-2021|Don’t Look Up|2026-02|10
catch-me-if-you-can-2002|Catch Me If You Can|2026-02|5
the-big-short|The Big Short|2026-02|6
the-social-network|The Social Network|2026-02|10
rush-hour|Rush Hour|2026-01|6
kiss-kiss-bang-bang-2005|Kiss Kiss Bang Bang|2026-01|7
la-jetee|La Jetée|2025-11|8`

// Things Thomas made
const MADE = [
  { id: 'batarang-2022', title: 'Batarang, cut by hand', medium: 'object', date: '2022-09', image: 'made/IMG_6314.jpg' },
  { id: 'lake-house', title: 'Snow Mountain Lake House', medium: 'architecture', date: '2026-05', image: 'made/P1010105.jpg', model: 'snow-mountain-lake-house.glb' },
  { id: 'lake-house-2', title: 'Snow Mountain Lake House — study', medium: 'architecture', date: '2026-05', image: 'made/IMG_1452.jpg' },
  { id: 'lake-house-3', title: 'Snow Mountain Lake House — night', medium: 'architecture', date: '2026-05', image: 'made/IMG_1457.jpg' },
  { id: 'lake-house-4', title: 'Snow Mountain Lake House — elevation', medium: 'architecture', date: '2026-05', image: 'made/P1010107.jpg' },
  { id: 'batarang-3d', title: 'Batarang — 3D Art Final', medium: '3d', date: '2026-11', image: 'made/work-in-progress.jpg', model: 'batarang.glb' },
]

// Lineage: output id -> input ids that fed it (edit freely)
const LINKS = {
  'batarang-3d': ['film:the-dark-knight', 'film:iron-man-2008', 'batarang-2022'],
  'batarang-2022': [],
  // 'lake-house': ['pin:p04', ...],   ← add the pins / films that shaped it
}

const items = []
for (const line of FILMS.split('\n')) {
  const [slug, title, date, rating] = line.split('|')
  items.push({ id: `film:${slug}`, kind: 'input', medium: 'film', title, date, rating: Number(rating), image: `films/${slug}.jpg` })
}
// Pinterest saves (newest first). Save dates aren't exposed, so they're spread evenly Jun 2025 → Nov 2026.
const pins = readdirSync(join(root, 'public/items/pins')).filter(f => f.endsWith('.jpg')).sort()
pins.forEach((f, i) => {
  const back = Math.round((17 * i) / Math.max(1, pins.length - 1))
  const d = new Date(Date.UTC(2026, 10 - back, 1))
  items.push({ id: `pin:${f.replace('.jpg', '')}`, kind: 'input', medium: 'pin', title: 'Saved on Pinterest', date: d.toISOString().slice(0, 7), approx: true, image: `pins/${f}` })
})
// Originals live in inbox/<folder>/ (git-ignored); web-sized JPEG copies are written to public/items/<folder>/.
const webCopy = (src, folder, base) => {
  const outDir = join(root, 'public/items', folder)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const out = join(outDir, `${base}.jpg`)
  if (!existsSync(out)) {
    try { execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '-Z', '1000', src, '--out', out], { stdio: 'ignore' }) } catch { return null }
  }
  return `${folder}/${base}.jpg`
}
const IMG = /\.(jpe?g|png|heic|webp|dng)$/i

// The life archive, read image by image (scripts/manifest.mjs)
const newDir = join(root, 'inbox/new')
if (existsSync(newDir)) {
  for (const f of readdirSync(newDir).filter((f) => IMG.test(f)).sort()) {
    const e = NEW[f]
    if (!e) { console.warn(`  (no manifest entry for inbox/new/${f} — skipped)`); continue }
    const base = f.replace(/\.[^.]+$/, '')
    const image = webCopy(join(newDir, f), 'new', base)
    if (!image) continue
    items.push({ id: `new:${base}`, kind: e.k, medium: e.m, title: e.t, date: e.d, image, ...(e.approx ? { approx: true } : {}) })
  }
  Object.assign(LINKS, NEW_LINKS)
}

// Drop-in folders: inbox/<folder>/YYYY-MM_Title.jpg  (jpg / png / heic / webp, any size)
const FOLDERS = { projects: 'project', cook: 'cooking', web: 'code', photo: 'photo' }
for (const [folder, medium] of Object.entries(FOLDERS)) {
  const dir = join(root, 'inbox', folder)
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir).filter((f) => IMG.test(f)).sort()) {
    const base = f.replace(/\.[^.]+$/, '')
    const image = webCopy(join(dir, f), folder, base.replace(/[^\w.-]+/g, '_'))
    if (!image) continue
    const m = base.match(/^(\d{4}-\d{2})(?:-\d{2})?[ _-]*(.*)$/)
    const title = m && m[2] ? m[2].replace(/[-_]+/g, ' ').trim() : base.replace(/[-_]+/g, ' ')
    const id = `${folder}:${base}`
    items.push({ id, kind: 'output', medium, title, date: m ? m[1] : NOW_MONTH, image })
    if (medium === 'cooking' && !LINKS[id]) LINKS[id] = ['film:chef']
  }
}
for (const m of MADE) items.push({ kind: 'output', ...m })
for (const it of items) if (LINKS[it.id]) it.influences = LINKS[it.id].filter(id => items.some(o => o.id === id))
// Pangram: AI-made inputs can't carry a thread. Results come from scripts/pangram.mjs
const pgPath = join(root, 'src/data/pangram.json')
if (existsSync(pgPath)) {
  const pg = JSON.parse(readFileSync(pgPath, 'utf8'))
  for (const it of items) {
    const img = pg[it.id]
    const rev = it.medium === 'film' ? pg[`review:${it.id.replace('film:', '')}`] : undefined
    if (img) it.ai = Math.round(img.ai * 100) / 100
    if (rev && rev.ai !== null) it.reviewHuman = rev.ai < 0.3
    // posters are studio key art; only Thomas's saves and his own work are judged
    it.verified = img ? img.ai < 0.5 : null
  }
}
items.sort((a, b) => a.date.localeCompare(b.date))
writeFileSync(join(root, 'src/data/items.json'), JSON.stringify(items, null, 1))
console.log(`${items.length} items → src/data/items.json`)

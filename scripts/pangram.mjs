// Pangram pass: check every saved input before it is allowed to carry a thread through the tesseract.
//   1. put your key in tesseract/.env  →  PANGRAM_API_KEY=...
//   2. node scripts/pangram.mjs        (writes src/data/pangram.json, src/data/reviews.json)
//   3. node scripts/build-items.mjs    (merges results into items.json)
// Runs offline, before the demo — the key never reaches the browser.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = existsSync(join(root, '.env')) ? readFileSync(join(root, '.env'), 'utf8') : ''
const KEY = process.env.PANGRAM_API_KEY || (env.match(/^PANGRAM_API_KEY\s*=\s*(.+)$/m) || [])[1]?.trim()
if (!KEY) {
  console.error('Missing PANGRAM_API_KEY. Create tesseract/.env with PANGRAM_API_KEY=your_key')
  process.exit(1)
}
const TEXT = 'https://text.external-api.pangram.com'
const IMAGE = 'https://image.external-api.pangram.com'
const headers = { 'Content-Type': 'application/json', 'x-api-key': KEY }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const outPath = join(root, 'src/data/pangram.json')
const results = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {}

async function poll(url, done) {
  const deadline = Date.now() + 120_000
  for (;;) {
    await sleep(1500)
    const r = await fetch(url, { headers })
    const j = await r.json()
    if (done(j)) return j
    if (Date.now() > deadline) throw new Error(`timeout polling ${url}`)
  }
}

async function checkImage(file) {
  const image_b64 = readFileSync(file).toString('base64')
  const r = await fetch(`${IMAGE}/v1/tasks`, { method: 'POST', headers, body: JSON.stringify({ image_b64, model: 'pangram-image-1' }) })
  const j = await r.json()
  if (!j.task_id) throw new Error(`image submit failed (${r.status}): ${JSON.stringify(j).slice(0, 200)}`)
  const res = await poll(`${IMAGE}/v1/tasks/${j.task_id}`, (x) => x.stage === 'STAGE_SUCCESS' || x.stage === 'STAGE_FAILED')
  if (res.stage === 'STAGE_FAILED') throw new Error(`image failed: ${JSON.stringify(res.error)}`)
  const ai = ['AI Detected', 'Likely AI', 'Partially AI'].includes(res.prediction)
  return { kind: 'image', ai: res.ai_likelihood ?? (ai ? 1 : 0), label: res.prediction, confidence: res.confidence, source: res.detection_source }
}

async function checkText(text) {
  const r = await fetch(`${TEXT}/task`, { method: 'POST', headers, body: JSON.stringify({ text, model: 'pangram-4' }) })
  const j = await r.json()
  if (!j.task_id) throw new Error(`text submit failed (${r.status}): ${JSON.stringify(j).slice(0, 200)}`)
  const res = await poll(`${TEXT}/task/${j.task_id}`, (x) => x.stage === 'STAGE_SUCCESS' || x.stage === 'STAGE_FAILED')
  if (res.stage === 'STAGE_FAILED') throw new Error(`text failed: ${res.headline}`)
  return {
    kind: 'text', ai: res.fraction_ai + 0.5 * res.fraction_ai_assisted, label: res.prediction_short,
    fraction_ai: res.fraction_ai, fraction_ai_assisted: res.fraction_ai_assisted, fraction_human: res.fraction_human, version: res.version,
  }
}

// Thomas's Letterboxd reviews (public pages), so his own words can be checked too
async function fetchReviews(slugs) {
  const out = {}
  for (const slug of slugs) {
    const r = await fetch(`https://letterboxd.com/tjwang/film/${slug}/`, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) tesseract-build', Accept: 'text/html' } })
    if (!r.ok) continue
    const h = await r.text()
    const m = h.match(/<div class="js-review-body[^>]*>([\s\S]*?)<\/div>/)
    if (!m) continue
    const text = m[1].replace(/<br\s*\/?>/g, '\n').replace(/<\/p>\s*<p>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&#039;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
    if (text) out[slug] = text
    await sleep(300)
  }
  return out
}

async function pool(tasks, n) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < tasks.length) await tasks[i++]() }))
}

const items = JSON.parse(readFileSync(join(root, 'src/data/items.json'), 'utf8'))
const force = process.argv.includes('--force')

// images
const imageTasks = items
  .filter((it) => it.image && (force || !results[it.id]))
  .map((it) => async () => {
    try {
      results[it.id] = await checkImage(join(root, 'public/items', it.image))
      console.log(`image  ${it.id.padEnd(40)} ${results[it.id].label} (${results[it.id].ai?.toFixed?.(2)})`)
    } catch (e) { console.warn(`image  ${it.id}: ${e.message}`) }
  })
await pool(imageTasks, 4)

// reviews
const films = items.filter((it) => it.medium === 'film').map((it) => it.id.replace('film:', ''))
const reviews = await fetchReviews(films)
writeFileSync(join(root, 'src/data/reviews.json'), JSON.stringify(reviews, null, 1))
for (const [slug, text] of Object.entries(reviews)) {
  const id = `review:${slug}`
  const words = text.split(/\s+/).length
  if (words < 50) { results[id] = { kind: 'text', ai: null, label: 'Too short', words }; continue }
  if (!force && results[id]?.label && results[id].label !== 'Too short') continue
  try {
    results[id] = { ...(await checkText(text)), words }
    console.log(`review ${slug.padEnd(40)} ${results[id].label} (${results[id].ai.toFixed(2)}, ${words} words)`)
  } catch (e) { console.warn(`review ${slug}: ${e.message}`) }
}

writeFileSync(outPath, JSON.stringify(results, null, 1))
const flagged = Object.entries(results).filter(([, r]) => r.ai !== null && r.ai >= 0.7)
console.log(`\n${Object.keys(results).length} checked · ${flagged.length} flagged as AI → src/data/pangram.json`)
for (const [id, r] of flagged) console.log(`  ✕ ${id}  ${r.label}`)

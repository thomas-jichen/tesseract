# Tesseract

**Everything I saved and everything I made, extruded through time.**

**Live:** https://thomas-jichen.github.io/tesseract/  ·  trailer take: https://thomas-jichen.github.io/tesseract/?cinema

Built at the SF Non-Slop Hackathon (Pangram × Kino × Capy × Paper, Nov 24 2026). The theme was *"What matters when you can generate anything? Can you explain your choices?"*

In *Interstellar*, the tesseract turns a room into strings because every object in it is stretched through time. This piece does the same thing to my taste. Every film I watched, every pin I saved and every thing I built hangs inside an infinite lattice. Each kind of thing runs on its own thread through time, and gold strings connect what inspired a work to the work itself. AI-made inputs, as identified by Pangram, can't hold a thread.

There's no interface: no title, no labels, no launch screen. You fall in and drift.

---

## Experience

| Do | Happens |
|---|---|
| **Scroll** / swipe / `↑` `↓` / `W` `S` | Move through time: past saves behind you, the future ahead |
| **Drag** | Look around |
| **Pinch**, `⌘`/`Alt` + scroll, `+` `−` | Zoom |
| **Shift-drag**, two-finger sideways swipe | Slide diagonally through the lattice |
| **Hover** a moment | Its lineage strings tremble and light runs from cause to effect |
| **Click** a moment | Fly in to face it (3D work turns in front of its print). Click, `Esc` or scroll to drift back |
| Scroll past the future | The tesseract folds into white light and starts again |
| `?cinema` | A hands-free 50 s take (fall → drift → Batarang lineage → fold) for recording the trailer |

## What's in it

- **Inputs:** 24 Letterboxd diary films (with watch dates and ratings), 38 Pinterest saves, and the places and works I went to see (Warhol, Van Gogh, the Evangelion exhibition, Google).
- **Outputs:** Snow Mountain Lake House (architecture model, photos and `.glb`), the Batarang 3D Art Final (`.glb`), and a life archive of 71 photos read one by one (`scripts/manifest.mjs`):
  - football: from a ball at one, to the Main Quad, to #29 under the lights
  - photography: Shanghai, Xi'an, NYC
  - physical projects: gauntlet sketch → armour → arc reactor → the gauntlet worn; cloud chamber; 3D prints
  - science: asteroid frames → poster → PHYS073
  - code and hackathons, art, cubing, food
- **Timeline:** 1998 → now. Long empty stretches fold down.
- **Threads:** the four bundles around your path each split into up to four threads, one per kind of thing.
  - Upper corners (what went in): films, pins, seen, roots, play, food.
  - Lower corners (what came out): photography, art, architecture, physical projects, football, science, code.
  - Each thread's strands take the colours of the moments it carries. Inward threads hang on the faces you drift past; outward ones hang just beyond, seen through the lattice.
- **Lineage:** stated links are bright gold, read from the work itself. For example:
  - an old Pudong photo → every Pearl Tower photo I later shot
  - gauntlet sketch → gauntlet
  - bulldog kalimba → bulldog logo → shady.Hacks
  - Warhol → pink portrait → on the wall
  - Unit-01 figure → exhibition → statue → *Evangelion*
  - Batarang 3D ← *The Dark Knight*, *Iron Man*, the 2022 batarang

  Things with no stated lineage get one faint amber "echo" to the earlier save whose colours most resemble them. Echoes are inferred, not claimed.
- **Other selves:** NASA EMU astronauts float translucently in the open space you drift through, ahead of you and behind you.

## Rendering

- **The lattice:** an infinite, irregular three-axis lattice of strand bundles: rectangular cross-sections, off-grid offsets, sub-bundles, missing bundles and frayed breaks.
  - It is tiled around the camera in the vertex shader.
  - The break pattern repeats exactly every tile, so nothing pops when the tiling wraps.
- **Paper pass:** runs progressively after the scene appears, so it never blocks the first frame.
- **Materials:** physically based strands, injected into three.js's `MeshStandardMaterial` via `onBeforeCompile`.
  - About a third are near-mirror silver metal; the rest are lacquer, paper and wood, each with its own roughness.
  - They reflect a studio environment built from drei `Lightformer` strip lights.
- **Lighting:** a warm key light and hemisphere fill. The three moments nearest the camera cast warm light onto the strands around them.
- **Post-processing:** N8AO ambient occlusion, restrained bloom, ACES Filmic tone mapping, grain, vignette, a whisper of chromatic aberration, and a slight barrel lens. Pointer picking goes through the same lens.
- **Prints:** every print is run through **Paper Shaders' paper-texture** at load (fibre, grain, crumples, occasional folds) and hung on a mount board.
- **Performance:** about 70–110 fps on an Apple-silicon MacBook (~100k strand segments).

## Sponsors

| Sponsor | Status | How it's used |
|---|---|---|
| **Pangram** (AI detection) | ✅ pipeline built · ⏳ needs API key | `scripts/pangram.mjs` checks every image (pins, posters, my work) with Pangram's image detector, and my Letterboxd reviews of 50+ words with the text detector. In the scene, **anything flagged as AI hangs dead**: grey, cold, translucent, unlit, with no strands and no lineage. Human-verified reviews get a warmer mount. Runs offline, so the key never reaches the browser. |
| **Paper** (design, Paper Shaders) | ✅ in the build · ⏳ title card | `src/lib/paperize.ts` renders each moment through `@paper-design/shaders`' `paperTextureFragmentShader` with Paper's own `ShaderMount`, and the paper prints become the scene's textures. Next: title card and one-page pitch designed in Paper (Paper Desktop + MCP). |
| **Kino** (AI video editor) | ✅ `?cinema` take · ⏳ trailer | `?cinema` flies a scripted 50 s path. Record it, then cut the trailer in Kino. Planned: Kino-cut clips of my own footage as *moving* rooms (`VideoTexture` prints). |
| **Capy** (AI software engineer) | ⏳ | This repo is public for Capy. Planned threads: Instagram/TikTok/X saved-posts importers and a Beli importer, opened as PRs. |

## Run it

```bash
npm install
npm run dev            # http://localhost:5173   ( ?cinema · ?nopaper · ?fx=afbctnv toggles post FX )
npm run build          # static build in dist/
npm run deploy         # build for /tesseract/ and publish to GitHub Pages (gh-pages branch)
```

### Add things

Drop originals into a folder under `inbox/` (git-ignored, never shipped), named `YYYY-MM_Title.jpg` (jpg / png / heic / webp, any size). Web-sized copies are written to `public/items/<folder>/`. The life archive in `inbox/new/` is described image by image in `scripts/manifest.mjs`, which holds each image's thread, title, capture date and lineage.

| Folder | Becomes |
|---|---|
| `projects/` | Projects thread |
| `web/` | Web work thread |
| `photo/` | Photography thread |
| `cook/` | Cooking thread (auto-linked to *Chef*) |

Then:

```bash
node scripts/build-items.mjs   # web-sized copies → public/items/<folder>/, writes src/data/items.json
```

Lineage lives in the `LINKS` table in `scripts/build-items.mjs` (`output id → [input ids]`).

### Pangram pass

```bash
cp .env.example .env           # PANGRAM_API_KEY=...   (git-ignored)
node scripts/pangram.mjs       # → src/data/pangram.json, src/data/reviews.json   (--force to re-check)
node scripts/build-items.mjs   # merges results: item.ai, item.verified, item.reviewHuman
```

## Structure

```
scripts/
  build-items.mjs     data: Letterboxd, Pinterest, my work, drop-in folders, lineage, Pangram merge
  pangram.mjs         Pangram image + text detection (offline)
src/
  lib/lattice.ts      time slices, tracks, irregular bundles, moments, lineage + echoes
  lib/paperize.ts     Paper Shaders paper-texture pass
  scene/Tess.tsx      lattice instancing, prints, lineage strings, astronauts, 3D works
  scene/TessRig.tsx   camera: time, look, zoom, slide, fly-in, fall, fold, ?cinema
  scene/Lighting.tsx  environment, key, moment lights
  scene/tmaterials.ts PBR strand material (tiling injected), light filaments, bookshelf grids
  scene/Effects.tsx   N8AO, lens, bloom, tone mapping, grain
  loader.ts           textures, palettes, Paper pass
public/
  items/              films · pins · made · projects · web · photo · cook
  models/             lake house · batarang · NASA EMU
```

## Roadmap

- [ ] **Pangram:** run the pass with the event key, then record which saves got flagged.
- [ ] **Kino:** trailer from the `?cinema` take. My own footage as moving rooms.
- [ ] **Paper:** title card and one-page pitch designed in Paper.
- [ ] **Capy:** importers (Instagram / TikTok / X saved posts, YouTube likes, Beli) as PRs.
- [ ] Real lineage links in place of colour echoes (which pins and films fed which project).
- [ ] Real Pinterest save dates. Pinterest doesn't expose them, so they're currently spread evenly from Jun 2025 to Nov 2026.
- [ ] Confirm the dates of a few scanned or forwarded childhood photos (marked `approx` in the manifest).
- [ ] Journal and notes (Notes / Notion / Docs) as written moments, checked by Pangram.
- [ ] `TASTE.md` export: a machine-readable taste profile where every principle cites the saves and works behind it, so agents can design in my taste.
- [ ] The autonomous brain: saves and reviews flow in on their own, and the tesseract grows. Then open it so anyone can fall into theirs.

## Credits

- Tribute to the tesseract in Christopher Nolan's *Interstellar* (2014). No footage, stills, score or logos from the film are used; the homage is in form, light and motion.
- Astronaut: NASA's *Extravehicular Mobility Unit* 3D model (NASA 3D Resources, science.nasa.gov). Shown without NASA endorsement.
- Paper texture: [Paper Shaders](https://shaders.paper.design) by Paper.
- Film posters via Letterboxd and pins via Pinterest, my own saved collections, shown here as personal references.
- Built with React Three Fiber, drei, @react-three/postprocessing (N8AO), three.js, GSAP and zustand.

Design language: [`DESIGN_LANGUAGE.md`](DESIGN_LANGUAGE.md).

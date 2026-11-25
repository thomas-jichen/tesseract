// Thomas's life archive (inbox/new), read image by image.
// file → { t: title, m: medium/thread, k: 'input' (seen, formative) | 'output' (made, did), d: 'YYYY-MM' (EXIF capture date), approx }
// Dates come from each photo's capture metadata; `approx` marks scans/screenshots whose metadata isn't the real moment.
export const NEW = {
  // ── roots: before and around everything else
  'd4483e7740f69361d2ed05df9ba14761.JPG': { t: 'Pudong, an old photograph', m: 'life', k: 'input', d: '1998-01', approx: true },
  '010f1e07240e059be08df3f4088417ab2d66c0c7d0.JPG': { t: 'First ball', m: 'football', k: 'input', d: '2008-12' },
  'IMG_4694.jpg': { t: 'Orange coat', m: 'life', k: 'input', d: '2010-01', approx: true },
  'IMG_0277.JPG': { t: 'Covered in trains', m: 'life', k: 'input', d: '2011-08' },
  'ff6f5f7adafafcd6a1934ba3f7be68ec.JPG': { t: 'First certificate', m: 'life', k: 'input', d: '2016-06', approx: true },
  'IMG_0470.HEIC': { t: 'Journal — “no distractions”', m: 'life', k: 'output', d: '2023-01' },

  // ── football
  'IMG_7630.JPG': { t: 'Main Quad, Stanford', m: 'football', k: 'output', d: '2017-07' },
  'IMG_5205.JPG': { t: 'Designing the Shady Side kit', m: 'football', k: 'output', d: '2024-08' },
  'IMG_5220.JPG': { t: 'Recovery', m: 'football', k: 'output', d: '2024-08' },
  'DSC_2018.JPG': { t: '#29', m: 'football', k: 'output', d: '2024-08' },
  '_OZ85324.JPG': { t: 'Night game', m: 'football', k: 'output', d: '2024-10' },
  'soccer.jpg': { t: 'Celebration', m: 'football', k: 'output', d: '2024-10' },
  'LastDay-27.JPG': { t: 'Last day', m: 'football', k: 'output', d: '2024-10' },

  // ── photography (his own camera work)
  'IMG_6959.jpg': { t: 'Light painting', m: 'photo', k: 'output', d: '2022-11' },
  'IMG_0159.JPG': { t: 'D600 in my lap', m: 'photo', k: 'output', d: '2023-06' },
  'IMG_0502.JPG': { t: 'Bell Tower, Xi’an', m: 'photo', k: 'output', d: '2023-06' },
  'ef3155391664483759832877250b8e75.JPG': { t: 'Behind the camera', m: 'photo', k: 'output', d: '2023-07' },
  'DSC_7824.jpg': { t: 'Pearl Tower, out of focus', m: 'photo', k: 'output', d: '2023-08' },
  'DSC_9499.JPG': { t: 'The Edge', m: 'photo', k: 'output', d: '2024-03' },
  'b8f4a2b8644e22a9b9d704e868deb0dc.JPG': { t: 'Testing a gimbal', m: 'photo', k: 'output', d: '2024-07' },
  'DSC_3530.jpg': { t: 'Lujiazui at night', m: 'photo', k: 'output', d: '2024-08' },
  'IMG_5101.JPG': { t: 'Rotunda', m: 'photo', k: 'output', d: '2024-08' },
  'DSC_0957.JPG': { t: 'Pearl Tower, pink', m: 'photo', k: 'output', d: '2025-06' },
  'DSC_1034.jpg': { t: 'mr willis', m: 'photo', k: 'output', d: '2025-06' },
  'P1000467.JPG': { t: 'Tripod', m: 'photo', k: 'output', d: '2025-06' },
  'DSC_1380.JPG': { t: 'Framed', m: 'photo', k: 'output', d: '2025-07' },
  'DSC_1410.JPG': { t: 'Rain, iced coffee', m: 'photo', k: 'output', d: '2025-07' },

  // ── physical projects (one thread)
  'IMG_6879.jpg': { t: 'Gauntlet — first sketch', m: 'object', k: 'output', d: '2022-11' },
  'IMG_5675.HEIC': { t: 'Shield, assembled', m: 'object', k: 'output', d: '2023-01' },
  'IMG_2867.JPG': { t: 'CD spinner, v1', m: 'object', k: 'output', d: '2024-01' },
  'IMG_3905.JPG': { t: 'Arc reactor', m: 'object', k: 'output', d: '2024-05' },
  'IMG_3906.JPG': { t: 'Armor shells', m: 'object', k: 'output', d: '2024-05' },
  'IMG_1548.HEIC': { t: 'Gauntlet, worn', m: 'object', k: 'output', d: '2024-06' },
  'IMG_1549.HEIC': { t: 'Gauntlet, forearm', m: 'object', k: 'output', d: '2024-06' },
  'IMG_4084.jpg': { t: 'Muscle sensors', m: 'object', k: 'output', d: '2024-06' },
  'IMG_6171.JPG': { t: 'CD spinner, v2', m: 'object', k: 'output', d: '2025-01' },
  'IMG_6218.JPG': { t: 'Yellow prints', m: 'object', k: 'output', d: '2025-01' },
  'IMG_6464.JPG': { t: '1989 keychains', m: 'object', k: 'output', d: '2025-02' },
  'IMG_6501.jpg': { t: '? block hooks', m: 'object', k: 'output', d: '2025-02' },
  'IMG_6836.JPG': { t: 'Saturn and Vader', m: 'object', k: 'output', d: '2025-04' },

  // ── science
  'IMG_9901.JPG': { t: 'Medals, Altoona', m: 'science', k: 'output', d: '2023-02' },
  'IMG_5623.JPG': { t: 'Asteroid frames', m: 'science', k: 'output', d: '2024-11' },
  'IMG_5770.JPG': { t: 'Cloud chamber, glowing', m: 'science', k: 'output', d: '2024-12' },
  'IMG_5833.JPG': { t: 'Cloud chamber, bench', m: 'science', k: 'output', d: '2024-12' },
  'DSC_4748-2.jpg': { t: 'Cloud chamber, close', m: 'science', k: 'output', d: '2025-01' },
  'IMG_1687.HEIC': { t: 'Mirror maze', m: 'science', k: 'output', d: '2025-02' },
  'IMG_0899.JPG': { t: 'Reverberation mapping', m: 'science', k: 'output', d: '2025-04' },
  'DSC_5657.JPG': { t: 'PHYS073', m: 'science', k: 'output', d: '2025-05' },
  'DSC_6092.JPG': { t: 'PHYS073, suited', m: 'science', k: 'output', d: '2025-05' },

  // ── code, desks, hackathons
  'IMG_2998.JPG': { t: 'First desk', m: 'code', k: 'output', d: '2021-04' },
  'IMG_4934.JPG': { t: 'Desk, Batman on the wall', m: 'code', k: 'output', d: '2022-03' },
  '70753605250__29C0D2ED-B283-4D0B-A2A8-4E417FB1C62D.HEIC': { t: 'Late code', m: 'code', k: 'output', d: '2023-06' },
  'IMG_4532.jpg': { t: 'Whiteboard, (B, 1, N)', m: 'code', k: 'output', d: '2024-07' },
  'IMG_5951.JPG': { t: 'Do you want to build a snowman?', m: 'code', k: 'output', d: '2024-12' },
  'DSC_5596.JPG': { t: 'shady.Hacks 2025', m: 'code', k: 'output', d: '2025-04' },

  // ── art & design
  'IMG_6452.jpg': { t: 'Hung on the wall', m: 'art', k: 'output', d: '2022-10' },
  'IMG_6837.HEIC': { t: 'Collage class', m: 'art', k: 'output', d: '2022-11' },
  'IMG_6976.JPG': { t: 'Pink portrait', m: 'art', k: 'output', d: '2022-11' },
  'IMG_1420.jpg': { t: 'Bulldog, low-poly', m: 'art', k: 'output', d: '2024-01' },

  // ── seen: places and works that went in
  'IMG_5491.JPG': { t: 'Googleplex', m: 'seen', k: 'input', d: '2022-07' },
  'IMG_6813.HEIC': { t: 'Warhol, Skull', m: 'seen', k: 'input', d: '2022-11' },
  'IMG_5082.JPG': { t: 'Evangelion, the drawings', m: 'seen', k: 'input', d: '2024-08' },
  '25c5c7803145157b318e08feecf582d5.JPG': { t: 'Unit-01, life-size', m: 'seen', k: 'input', d: '2024-08' },
  'DSC_1395.JPG': { t: 'Van Gogh, and a phone', m: 'seen', k: 'input', d: '2025-07' },

  // ── play
  '01ec4ff1e180d5a3d81e6949f322836faa3cea2f69.JPG': { t: 'Switch', m: 'play', k: 'input', d: '2021-07' },
  'IMG_7829.jpg': { t: 'Unit-01, on the desk', m: 'play', k: 'input', d: '2023-01' },
  'IMG_8232.jpg': { t: 'Kalimba, bulldog', m: 'play', k: 'input', d: '2023-01' },
  'IMG_8816.jpg': { t: 'Cubing, round one', m: 'play', k: 'output', d: '2023-02' },
  'IMG_9258.HEIC': { t: 'Cubing, finals', m: 'play', k: 'output', d: '2023-02' },

  // ── food
  'IMG_7306.jpg': { t: 'Steak, somewhere good', m: 'cooking', k: 'input', d: '2022-12' },
  'IMG_5439.jpg': { t: 'Matcha', m: 'cooking', k: 'output', d: '2024-10' },
}

const id = (f) => `new:${f.replace(/\.[^.]+$/, '')}`

// What visibly led to what (read from the photos themselves).
export const NEW_LINKS = {
  // old Pudong → every Pearl Tower he went back to shoot
  [id('DSC_7824.jpg')]: [id('d4483e7740f69361d2ed05df9ba14761.JPG')],
  [id('DSC_3530.jpg')]: [id('d4483e7740f69361d2ed05df9ba14761.JPG'), id('IMG_0502.JPG')],
  [id('DSC_0957.JPG')]: [id('d4483e7740f69361d2ed05df9ba14761.JPG')],
  [id('DSC_1380.JPG')]: [id('d4483e7740f69361d2ed05df9ba14761.JPG'), id('DSC_7824.jpg')],
  // a ball at one → the Main Quad → #29 under the lights
  [id('IMG_7630.JPG')]: [id('010f1e07240e059be08df3f4088417ab2d66c0c7d0.JPG')],
  [id('_OZ85324.JPG')]: [id('IMG_7630.JPG'), id('IMG_5205.JPG')],
  [id('soccer.jpg')]: [id('IMG_5220.JPG')],
  // a hand-cut batarang → a gauntlet on paper → a gauntlet on his arm
  [id('IMG_6879.jpg')]: ['batarang-2022', 'film:the-dark-knight'],
  [id('IMG_1548.HEIC')]: [id('IMG_6879.jpg'), id('IMG_3906.JPG'), id('IMG_4084.jpg')],
  [id('IMG_3905.JPG')]: ['film:iron-man-2008', id('IMG_5675.HEIC')],
  [id('IMG_6171.JPG')]: [id('IMG_2867.JPG')],
  // bulldog kalimba → bulldog logo → shady.Hacks
  [id('IMG_1420.jpg')]: [id('IMG_8232.jpg')],
  [id('DSC_5596.JPG')]: [id('IMG_1420.jpg')],
  // Warhol → his pink portrait → on the wall
  [id('IMG_6976.JPG')]: [id('IMG_6813.HEIC')],
  [id('IMG_6452.jpg')]: [id('IMG_6976.JPG')],
  // Unit-01 on the desk → the drawings → the giant → the film
  [id('IMG_5082.JPG')]: [id('IMG_7829.jpg')],
  [id('25c5c7803145157b318e08feecf582d5.JPG')]: [id('IMG_7829.jpg')],
  'film:evangelion-10-you-are-not-alone': [id('25c5c7803145157b318e08feecf582d5.JPG'), id('IMG_5082.JPG')],
  // asteroid frames → the poster → PHYS073
  [id('IMG_0899.JPG')]: [id('IMG_5623.JPG')],
  [id('DSC_5657.JPG')]: [id('IMG_0899.JPG')],
  [id('DSC_6092.JPG')]: [id('IMG_0899.JPG')],
  // the cloud chamber, built then photographed
  [id('IMG_5770.JPG')]: [id('IMG_5833.JPG')],
  [id('DSC_4748-2.jpg')]: [id('IMG_5770.JPG'), id('IMG_0159.JPG')],
  // code
  [id('IMG_5951.JPG')]: [id('70753605250__29C0D2ED-B283-4D0B-A2A8-4E417FB1C62D.HEIC')],
  [id('IMG_4532.jpg')]: [id('IMG_5491.JPG')],
  [id('IMG_4934.JPG')]: [id('IMG_2998.JPG'), 'film:the-dark-knight'],
  // food
  [id('IMG_5439.jpg')]: ['film:chef'],
}

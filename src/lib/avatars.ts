// Deterministic cartoon / illustration avatars rendered as inline SVG data URIs.
// No network calls and no image assets needed — each seed always maps to the
// same friendly "fun emoji" style face, themed from a fixed palette.

const PALETTES: [string, string][] = [
  ["#FDA7DF", "#D980FA"],
  ["#12CBC4", "#1289A7"],
  ["#FFC312", "#F79F1F"],
  ["#9BE15D", "#00E3AE"],
  ["#7AC8FF", "#4A8DFF"],
  ["#FF9F80", "#E84393"],
  ["#A29BFE", "#6C5CE7"],
  ["#55E6C1", "#0BE881"],
]

const INK = "#2f3542"

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function eyes(style: number): string {
  switch (style) {
    case 1: // happy arcs
      return `<path d="M30 46 Q37 38 44 46" /><path d="M56 46 Q63 38 70 46" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`
    case 2: // wink
      return `<circle cx="37" cy="44" r="5.5" fill="${INK}"/><path d="M56 44 H70" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`
    default: // dots
      return `<circle cx="37" cy="44" r="5.5" fill="${INK}"/><circle cx="63" cy="44" r="5.5" fill="${INK}"/>`
  }
}

function mouth(style: number): string {
  switch (style) {
    case 1: // grin
      return `<path d="M36 60 Q50 75 64 60 Z" fill="${INK}"/>`
    case 2: // small o
      return `<circle cx="50" cy="64" r="4.5" fill="${INK}"/>`
    default: // smile
      return `<path d="M36 61 Q50 73 64 61" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`
  }
}

function buildSvg(seed: string): string {
  const h = hash(seed)
  const [c1, c2] = PALETTES[h % PALETTES.length]
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>`,
    `</linearGradient></defs>`,
    `<rect width="100" height="100" rx="50" fill="url(#g)"/>`,
    `<circle cx="30" cy="58" r="6" fill="#ffffff" opacity="0.25"/>`,
    `<circle cx="70" cy="58" r="6" fill="#ffffff" opacity="0.25"/>`,
    eyes(h % 3),
    mouth((h >> 2) % 3),
    `</svg>`,
  ].join("")
}

/** Returns an SVG data URI for a cartoon avatar derived from `seed`. */
export function cartoonAvatar(seed: string): string {
  return `data:image/svg+xml,${encodeURIComponent(buildSvg(seed))}`
}

/** Stable set of seeds used for the avatar picker in the contact form. */
export const CARTOON_AVATAR_SEEDS = [
  "Mango",
  "Pixel",
  "Boba",
  "Coco",
  "Ziggy",
  "Nova",
  "Pebble",
  "Mochi",
]

export const CARTOON_AVATARS = CARTOON_AVATAR_SEEDS.map(cartoonAvatar)

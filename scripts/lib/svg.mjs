/**
 * Shared drawing vocabulary for the profile assets.
 *
 * The palette is the portfolio's own token set, so GitHub and
 * francescoiaforte.vercel.app read as one brand rather than two.
 *
 * GitHub renders README SVGs inside <img>, which means no scripts, no external
 * fonts and no CSS files. Only SMIL animation and inline styling survive, so
 * everything here stays self-contained and degrades to a still frame when
 * animation is unavailable.
 */

/**
 * Every asset is drawn on this width.
 *
 * GitHub gives a README about 830px on a laptop and about 355px on a phone,
 * and an `<img width="100%">` scales the whole drawing to fit. A banner drawn
 * 1160 wide is therefore shown at 0.31 on a phone, which turned 12px captions
 * into 4px smears — the desktop view was fine and the phone view was mush.
 *
 * Drawing on a narrow canvas inverts that: the phone scale is about 0.55, the
 * laptop scales *up* (vectors, so it stays sharp), and one type scale serves
 * both. The cost is that there is genuinely less room per line, which is the
 * honest constraint a phone imposes anyway.
 */
export const CANVAS = 640;

/** Type that still reads at CANVAS scaled to phone width: 19 lands near 10.5px. */
export const MIN_TYPE = 19;

export const palette = {
  void: "#05060f",
  space: "#080a17",
  space2: "#0e1020",
  surface: "#171a33",
  line: "#262a4d",
  line2: "#343963",
  lumen: "#f4f4fb",
  lumen2: "#b8b6d4",
  lumen3: "#8683a8",
  violet: "#915eff",
  violet2: "#b18cff",
  cyan: "#22d3ee",
  magenta: "#f272c8",
  amber: "#ff8a3d",
};

/** Custom faces cannot load inside an <img>; these stacks are always present. */
export const font = {
  display:
    "'Unbounded','Space Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  body: "'Space Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
};

export function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rounds to 2 decimals so regenerating an unchanged asset yields no diff. */
export const n = (value) => Math.round(value * 100) / 100;

export function svg({ width, height, title, desc, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t d" font-family="${font.body}">
<title id="t">${escapeText(title)}</title>
<desc id="d">${escapeText(desc)}</desc>
${body}
</svg>
`;
}

/** Deep field the whole system sits on, plus the engineering grid. */
export function backdrop(width, height, { grid = 44 } = {}) {
  const columns = [];
  for (let x = grid; x < width; x += grid) {
    columns.push(`<path d="M${x} 0V${height}"/>`);
  }
  const rows = [];
  for (let y = grid; y < height; y += grid) {
    rows.push(`<path d="M0 ${y}H${width}"/>`);
  }
  return `<rect width="${width}" height="${height}" rx="14" fill="url(#field)"/>
<g stroke="${palette.line}" stroke-width="1" opacity="0.16">${columns.join("")}${rows.join("")}</g>
<rect width="${width}" height="${height}" rx="14" fill="none" stroke="${palette.line}" stroke-width="1.5"/>`;
}

export function fieldGradient(width, height) {
  // User space, not the default bounding box: every banner fills the canvas
  // with it, and stating it in canvas coordinates lets a second shape sample
  // the identical ramp and disappear into the panel.
  return `<linearGradient id="field" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${width}" y2="${height}">
  <stop offset="0" stop-color="${palette.void}"/>
  <stop offset="0.55" stop-color="${palette.space}"/>
  <stop offset="1" stop-color="${palette.space2}"/>
</linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="${palette.violet}" stop-opacity="0.30"/>
  <stop offset="1" stop-color="${palette.violet}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${palette.cyan}"/>
  <stop offset="0.52" stop-color="${palette.violet}"/>
  <stop offset="1" stop-color="${palette.magenta}"/>
</linearGradient>`;
}

/**
 * A pill-shaped layer used by every architecture diagram.
 * `accent` colours the left rule; the label sits in mono, the note in body.
 */
export function layer({ x, y, width, height, label, note, accent }) {
  const noteLine = note
    ? `<text x="${x + 22}" y="${y + height / 2 + 20}" font-family="${font.body}" font-size="16" fill="${palette.lumen3}">${escapeText(note)}</text>`
    : "";
  const labelY = note ? y + height / 2 - 5 : y + height / 2 + 6;
  // Layers carry the meaning of the diagram, so they are never animated in:
  // renderers that ignore SMIL still show the complete architecture.
  return `<g>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="${palette.surface}" fill-opacity="0.55" stroke="${palette.line2}"/>
  <rect x="${x}" y="${y + 10}" width="3" height="${height - 20}" rx="1.5" fill="${accent}"/>
  <text x="${x + 22}" y="${labelY}" font-family="${font.mono}" font-size="18" letter-spacing="0.05em" fill="${palette.lumen}">${escapeText(label)}</text>
  ${noteLine}
</g>`;
}

/** Vertical connector with a packet sliding down it. */
export function flow({ x, y1, y2, delay = 0, color = palette.cyan }) {
  return `<g>
  <path d="M${x} ${y1}V${y2}" stroke="${palette.line2}" stroke-width="1.5"/>
  <path d="M${x - 4} ${y2 - 6}L${x} ${y2}L${x + 4} ${y2 - 6}" fill="none" stroke="${palette.line2}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="${x}" cy="${y1}" r="2.6" fill="${color}" opacity="0">
    <animate attributeName="cy" from="${y1}" to="${y2}" dur="2.4s" begin="${delay}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="${delay}s" repeatCount="indefinite"/>
  </circle>
</g>`;
}

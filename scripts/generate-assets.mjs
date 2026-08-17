/**
 * Builds the three static profile assets: hero, focus line, systems diagram.
 *
 * Deterministic and offline. Run it, commit whatever changed.
 *   node scripts/generate-assets.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  backdrop,
  escapeText,
  fieldGradient,
  flow,
  font,
  layer,
  n,
  palette,
  svg,
} from "./lib/svg.mjs";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");

/* ------------------------------------------------------------------ hero -- */

/**
 * Left half states who Francesco is; right half is an agent topology whose
 * packets keep moving. Nodes are laid out on fixed columns so the still frame
 * (no SMIL) is already a complete picture.
 */
function hero() {
  const width = 1160;
  const height = 320;
  const columns = [
    { x: 792, count: 2, accent: palette.cyan },
    { x: 890, count: 4, accent: palette.violet2 },
    { x: 988, count: 3, accent: palette.violet },
    { x: 1086, count: 2, accent: palette.magenta },
  ];

  const midY = 168;
  const spread = 34;
  const nodes = columns.map(({ x, count, accent }) => {
    const top = midY - ((count - 1) * spread) / 2;
    return {
      x,
      accent,
      points: Array.from({ length: count }, (_, i) => ({ x, y: top + i * spread })),
    };
  });

  const edges = [];
  const packets = [];
  for (let c = 0; c < nodes.length - 1; c += 1) {
    for (const from of nodes[c].points) {
      for (const to of nodes[c + 1].points) {
        edges.push(
          `<path d="M${from.x} ${n(from.y)}L${to.x} ${n(to.y)}" stroke="${palette.line2}" stroke-width="1" opacity="0.5"/>`,
        );
      }
    }
    // One packet per hop keeps the motion legible instead of busy.
    const from = nodes[c].points[c % nodes[c].points.length];
    const to = nodes[c + 1].points[(c + 1) % nodes[c + 1].points.length];
    packets.push(
      `<circle r="3" fill="${nodes[c + 1].accent}" opacity="0">
    <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" begin="${c * 0.55}s" repeatCount="indefinite"/>
    <animateMotion dur="3.2s" begin="${c * 0.55}s" repeatCount="indefinite" path="M${from.x} ${n(from.y)}L${to.x} ${n(to.y)}"/>
  </circle>`,
    );
  }

  const dots = nodes
    .flatMap(({ points, accent }, c) =>
      points.map(
        (p, i) => `<g>
    <circle cx="${p.x}" cy="${n(p.y)}" r="9" fill="${accent}" opacity="0.10">
      <animate attributeName="r" values="9;13;9" dur="4s" begin="${n((c * 3 + i) * 0.25)}s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${p.x}" cy="${n(p.y)}" r="4.2" fill="${palette.space}" stroke="${accent}" stroke-width="1.6"/>
  </g>`,
      ),
    )
    .join("\n");

  const columnLabels = ["input", "agents", "systems", "delivery"]
    .map(
      (label, i) =>
        `<text x="${columns[i].x}" y="277" text-anchor="middle" font-family="${font.mono}" font-size="10.5" letter-spacing="0.14em" fill="${palette.lumen3}">${label.toUpperCase()}</text>`,
    )
    .join("\n");

  const body = `<defs>
${fieldGradient(width, height)}
</defs>
${backdrop(width, height)}
<ellipse cx="940" cy="168" rx="230" ry="150" fill="url(#halo)"/>

<g>
  <rect x="56" y="58" width="34" height="3" rx="1.5" fill="url(#rim)"/>
  <text x="100" y="64" font-family="${font.mono}" font-size="12.5" letter-spacing="0.20em" fill="${palette.cyan}">AI ENGINEER · FULL-STACK DEVELOPER</text>

  <text x="56" y="132" font-family="${font.display}" font-size="49" font-weight="700" letter-spacing="0.01em" fill="${palette.lumen}">FRANCESCO</text>
  <text x="56" y="186" font-family="${font.display}" font-size="49" font-weight="700" letter-spacing="0.01em" fill="url(#rim)">IAFORTE</text>

  <text x="56" y="228" font-size="17" fill="${palette.lumen2}">I design and ship complete AI-native and full-stack systems,</text>
  <text x="56" y="252" font-size="17" fill="${palette.lumen2}">from architecture to production.</text>

  <text x="56" y="285" font-family="${font.mono}" font-size="11.5" letter-spacing="0.08em" fill="${palette.lumen3}">NAPOLI, ITALIA — SOFTWARE ENGINEERING &amp; APPLIED AI</text>
</g>

<g>
${edges.join("\n")}
${dots}
${packets.join("\n")}
${columnLabels}
</g>`;

  return svg({
    width,
    height,
    title: "Francesco Iaforte — AI Engineer and Full-Stack Developer",
    desc: "Name and role beside an animated agent topology: input nodes feed agents, agents feed systems, systems feed delivery.",
    body,
  });
}

/* ----------------------------------------------------------------- focus -- */

/**
 * One micro-animation for the whole profile: the disciplines type themselves
 * out in sequence behind a shell prompt. A clip rect does the typing, so there
 * is no per-character markup and no external service.
 */
function focus() {
  const width = 760;
  const height = 58;
  const startX = 108;
  const words = [
    "AI engineering & agentic systems",
    "RAG and knowledge systems",
    "full-stack product delivery",
    "software architecture at scale",
  ];

  const step = 4.2;
  const total = n(words.length * step);
  const charWidth = 10.35; // measured for 17.5px monospace

  const lines = words
    .map((word, i) => {
      // A few pixels of slack: fallback fonts are slightly wider than the
      // metric above and would clip the final character.
      const textWidth = n(word.length * charWidth + 10);
      const begin = n(i * step);
      const id = `clip${i}`;
      // The first phrase is fully drawn in the base attributes so a renderer
      // that ignores SMIL still shows one complete line instead of an empty bar.
      const restingWidth = i === 0 ? textWidth : 0;
      const restingOpacity = i === 0 ? 1 : 0;
      return `<clipPath id="${id}"><rect x="${startX}" y="14" height="30" width="${restingWidth}">
    <animate attributeName="width" values="0;${textWidth};${textWidth};0" keyTimes="0;0.26;0.82;1" dur="${step}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1"/>
  </rect></clipPath>
  <g clip-path="url(#${id})" opacity="${restingOpacity}">
    <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.02;0.9;0.94;1" dur="${total}s" begin="${begin - i * step}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.02;0.9;1" dur="${step}s" begin="${begin}s" repeatCount="indefinite"/>
    <text x="${startX}" y="37" font-family="${font.mono}" font-size="17.5" fill="${palette.lumen}">${escapeText(word)}</text>
  </g>
  <rect y="20" width="2" height="20" fill="${palette.cyan}" x="${startX}" opacity="0">
    <animate attributeName="x" values="${startX};${n(startX + textWidth)};${n(startX + textWidth)};${startX}" keyTimes="0;0.26;0.82;1" dur="${step}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.02;0.94;1" dur="${step}s" begin="${begin}s" repeatCount="indefinite"/>
  </rect>`;
    })
    .join("\n  ");

  const body = `<defs>
${fieldGradient(width, height)}
</defs>
<rect width="${width}" height="${height}" rx="10" fill="url(#field)" stroke="${palette.line}"/>
<text x="26" y="37" font-family="${font.mono}" font-size="17.5" fill="${palette.violet2}">~</text>
<text x="44" y="37" font-family="${font.mono}" font-size="17.5" fill="${palette.cyan}">$</text>
<text x="68" y="37" font-family="${font.mono}" font-size="17.5" fill="${palette.lumen3}">›</text>
${lines}`;

  return svg({
    width,
    height,
    title: "What I focus on",
    desc: `A shell prompt typing out, in turn: ${words.join("; ")}.`,
    body,
  });
}

/* --------------------------------------------------------------- systems -- */

/** The end-to-end slice Francesco actually owns, top to bottom. */
function systems() {
  const width = 900;
  const rows = [
    { label: "USERS & CLIENTS", note: "Operators, sales teams, technicians, guests, admins", accent: palette.cyan },
    { label: "FRONTEND", note: "React · Angular · Next.js · React Native / Capacitor", accent: palette.cyan },
    { label: "API & BACKEND SERVICES", note: "Laravel · NestJS · Node.js · Python · REST · webhooks", accent: palette.violet2 },
    { label: "APPLICATION & AGENT ORCHESTRATION", note: "Domain services, workflows, queues, jobs, tool-using agents", accent: palette.violet },
    { label: "LLM · RAG · ML", note: "Retrieval, embeddings, document AI, forecasting, fine-tuning", accent: palette.violet },
    { label: "DATA · VECTOR · STORAGE", note: "PostgreSQL · MySQL · Prisma · Eloquent · vector stores · files", accent: palette.magenta },
    { label: "SECURITY, OBSERVABILITY & DELIVERY", note: "RBAC · audit trail · secrets · logs · CI · multi-environment deploy", accent: palette.amber },
  ];

  const boxX = 90;
  const boxW = width - boxX * 2;
  const boxH = 56;
  const gap = 26;
  const top = 46;
  const height = top + rows.length * boxH + (rows.length - 1) * gap + 42;

  const blocks = rows
    .map((row, i) =>
      layer({
        x: boxX,
        y: top + i * (boxH + gap),
        width: boxW,
        height: boxH,
        label: row.label,
        note: row.note,
        accent: row.accent,
        delay: n(i * 0.12),
      }),
    )
    .join("\n");

  const arrows = rows
    .slice(0, -1)
    .map((_, i) =>
      flow({
        x: width / 2,
        y1: top + i * (boxH + gap) + boxH + 4,
        y2: top + (i + 1) * (boxH + gap) - 4,
        delay: n(i * 0.3),
        color: i < 2 ? palette.cyan : i < 4 ? palette.violet2 : palette.magenta,
      }),
    )
    .join("\n");

  const body = `<defs>
${fieldGradient(width, height)}
</defs>
${backdrop(width, height, { grid: 50 })}
<text x="${width / 2}" y="30" text-anchor="middle" font-family="${font.mono}" font-size="12" letter-spacing="0.22em" fill="${palette.lumen3}">SYSTEMS I BUILD</text>
${arrows}
${blocks}`;

  return svg({
    width,
    height,
    title: "Systems I build, end to end",
    desc: `Seven layers, top to bottom: ${rows.map((r) => r.label.toLowerCase()).join("; ")}.`,
    body,
  });
}

/* ------------------------------------------------------------------------- */

mkdirSync(out, { recursive: true });
for (const [name, build] of Object.entries({ hero, focus, systems })) {
  const file = resolve(out, `${name}.svg`);
  writeFileSync(file, build());
  console.log(`wrote assets/${name}.svg`);
}

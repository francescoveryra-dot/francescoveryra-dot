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
  CANVAS,
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
  const width = CANVAS;
  const height = 300;
  const columns = [
    { x: 436, count: 2, accent: palette.cyan },
    { x: 490, count: 4, accent: palette.violet2 },
    { x: 544, count: 3, accent: palette.violet },
    { x: 598, count: 2, accent: palette.magenta },
  ];

  const midY = 150;
  const spread = 30;
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

  // The per-column captions are gone. Four of them across 220px of canvas were
  // unreadable on a laptop and invisible on a phone; the topology reads as a
  // topology without them, and <desc> still names the four stages for anyone
  // who cannot see it at all.
  const body = `<defs>
${fieldGradient(width, height)}
</defs>
${backdrop(width, height, { grid: 40 })}
<ellipse cx="520" cy="150" rx="180" ry="130" fill="url(#halo)"/>

<g>
  <rect x="40" y="52" width="26" height="3" rx="1.5" fill="url(#rim)"/>
  <text x="76" y="58" font-family="${font.mono}" font-size="17" letter-spacing="0.12em" fill="${palette.cyan}">AI ENGINEER · FULL-STACK</text>

  <text x="40" y="118" font-family="${font.display}" font-size="44" font-weight="700" letter-spacing="0.01em" fill="${palette.lumen}">FRANCESCO</text>
  <text x="40" y="164" font-family="${font.display}" font-size="44" font-weight="700" letter-spacing="0.01em" fill="url(#rim)">IAFORTE</text>

  <text x="40" y="202" font-size="20" fill="${palette.lumen2}">I design and ship complete</text>
  <text x="40" y="228" font-size="20" fill="${palette.lumen2}">AI-native and full-stack systems,</text>
  <text x="40" y="254" font-size="20" fill="${palette.lumen2}">from architecture to production.</text>

  <text x="40" y="280" font-family="${font.mono}" font-size="15" letter-spacing="0.08em" fill="${palette.lumen3}">NAPOLI, ITALIA — APPLIED AI</text>
</g>

<g>
${edges.join("\n")}
${dots}
${packets.join("\n")}
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
 * One micro-animation: disciplines cycle behind a shell prompt.
 *
 * This used to type each phrase out by animating the width of a `clipPath`
 * rect. It looked right on a desktop browser and broke on phones and tablets:
 * where a renderer ignores `clip-path` on `<text>`, nothing is clipped, and
 * all four phrases paint on top of each other into an unreadable smear. That
 * is exactly what a reader saw on the GitHub mobile view.
 *
 * So the reveal is now per-phrase `opacity`, stepped with `calcMode="discrete"`
 * — the most boring animation SMIL has, and one that cannot fail into overlap:
 * the phrases after the first are written at `opacity="0"`, so a renderer that
 * runs no animation at all shows one clean line instead of four stacked ones.
 * The cursor steps between phrase ends the same way.
 */
function focus() {
  const width = 500;
  const height = 62;
  const startX = 78;
  const words = [
    "AI engineering & agentic systems",
    "RAG and knowledge systems",
    "full-stack product delivery",
    "software architecture at scale",
  ];
  const count = words.length;
  const total = n(count * 4.2);
  const charWidth = 10.8;
  // Fractions of one phrase's slot: type the line out, hold it, then clear.
  const typeIn = 0.28;
  const hold = 0.82;

  const phrases = words.map((word, i) => ({
    word,
    // The clip is the typewriter: a rect that grows from nothing to the width
    // of the line, revealing it a character at a time.
    textWidth: n(word.length * charWidth + 10),
    id: `clip${i}`,
    t0: n(i / count),
    t1: n(i / count + typeIn / count),
    t2: n(i / count + hold / count),
    t3: n((i + 1) / count),
  }));

  const clipDefs = phrases
    .map((phrase, i) => {
      const { id, textWidth, t0, t1, t2, t3 } = phrase;
      // Static width for a renderer that ignores SMIL: the first line is fully
      // revealed, the rest stay clipped to nothing. Without this the four
      // phrases would print on top of one another.
      const fallbackWidth = i === 0 ? textWidth : 0;
      const { keyTimes, values } =
        i === 0
          ? { keyTimes: `0;${t1};${t2};${t3};1`, values: `0;${textWidth};${textWidth};0;0` }
          : i === count - 1
            ? { keyTimes: `0;${t0};${t1};${t2};1`, values: `0;0;${textWidth};${textWidth};0` }
            : {
                keyTimes: `0;${t0};${t1};${t2};${t3};1`,
                values: `0;0;${textWidth};${textWidth};0;0`,
              };
      return `<clipPath id="${id}">
  <rect x="${startX}" y="16" width="${fallbackWidth}" height="32">
    <animate attributeName="width" values="${values}" keyTimes="${keyTimes}" dur="${total}s" begin="0s" repeatCount="indefinite"/>
  </rect>
</clipPath>`;
    })
    .join("\n");

  const lines = phrases
    .map(
      (phrase) =>
        `<text clip-path="url(#${phrase.id})" x="${startX}" y="40" font-family="${font.mono}" font-size="18" fill="${palette.lumen}">${escapeText(phrase.word)}</text>`,
    )
    .join("\n");

  // The caret rides the end of whatever is being typed, then snaps back to the
  // prompt when the line clears.
  const cursorTimes = ["0"];
  const cursorXs = [String(startX)];
  for (const phrase of phrases) {
    cursorTimes.push(String(phrase.t1), String(phrase.t2), String(phrase.t3));
    const end = n(startX + phrase.textWidth);
    cursorXs.push(String(end), String(end), String(startX));
  }

  const body = `<defs>
${fieldGradient(width, height)}
${clipDefs}
</defs>
<rect width="${width}" height="${height}" rx="10" fill="url(#field)" stroke="${palette.line}"/>
<text x="22" y="40" font-family="${font.mono}" font-size="18" fill="${palette.violet2}">~</text>
<text x="40" y="40" font-family="${font.mono}" font-size="18" fill="${palette.cyan}">$</text>
<text x="58" y="40" font-family="${font.mono}" font-size="18" fill="${palette.lumen3}">›</text>
${lines}
<rect x="${startX}" y="23" width="2" height="21" fill="${palette.cyan}">
  <animate attributeName="x" values="${cursorXs.join(";")}" keyTimes="${cursorTimes.join(";")}" dur="${total}s" begin="0s" repeatCount="indefinite"/>
  <animate attributeName="opacity" values="1;1;0;1" keyTimes="0;0.45;0.5;1" dur="0.9s" begin="0s" repeatCount="indefinite"/>
</rect>`;

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
  const width = CANVAS;
  // Notes are kept under about 62 characters: that is what fits the box at a
  // note size which survives the phone downscale. A longer, truer-sounding
  // line that renders as a grey smudge is worth less than a shorter one that
  // can be read.
  const rows = [
    { label: "USERS & CLIENTS", note: "Operators, sales teams, technicians, guests, admins", accent: palette.cyan },
    { label: "FRONTEND", note: "React · Angular · Next.js · React Native / Capacitor", accent: palette.cyan },
    { label: "API & BACKEND SERVICES", note: "Laravel · NestJS · Node.js · Python · REST · webhooks", accent: palette.violet2 },
    { label: "APPLICATION & AGENT ORCHESTRATION", note: "Domain services, workflows, queues, jobs, tool-using agents", accent: palette.violet },
    { label: "LLM · RAG · ML", note: "Retrieval, embeddings, document AI, forecasting, fine-tuning", accent: palette.violet },
    { label: "DATA · VECTOR · STORAGE", note: "PostgreSQL · MySQL · Prisma · vector stores · files", accent: palette.magenta },
    { label: "SECURITY, OBSERVABILITY & DELIVERY", note: "RBAC · audit trail · secrets · logs · CI · multi-env deploy", accent: palette.amber },
  ];

  const boxX = 36;
  const boxW = width - boxX * 2;
  const boxH = 78;
  const gap = 22;
  const top = 52;
  const height = top + rows.length * boxH + (rows.length - 1) * gap + 40;

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
${backdrop(width, height, { grid: 40 })}
<text x="${width / 2}" y="33" text-anchor="middle" font-family="${font.mono}" font-size="16" letter-spacing="0.18em" fill="${palette.lumen3}">SYSTEMS I BUILD</text>
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

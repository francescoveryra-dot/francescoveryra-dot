/**
 * Builds assets/activity.svg from the GitHub GraphQL API.
 *
 *   GITHUB_TOKEN=... node scripts/generate-activity.mjs
 *
 * The token is only ever read from the environment and only needs the default
 * read access GitHub Actions already grants. It is never written into the SVG.
 *
 * Honesty constraint: a GITHUB_TOKEN sees public activity only, and most of the
 * engineering behind this profile lives in private repositories. The card says
 * so on its face rather than passing a partial number off as a total.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { backdrop, escapeText, fieldGradient, font, n, palette, svg } from "./lib/svg.mjs";

const LOGIN = process.env.PROFILE_LOGIN ?? "francescoveryra-dot";
const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes { name stargazerCount primaryLanguage { name } pushedAt }
    }
    contributionsCollection {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
  }
}`;

async function fetchProfile({ attempts = 4 } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "profile-activity-generator",
      },
      body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
    });

    // The GraphQL endpoint returns 5xx often enough that a single failure
    // should not fail the weekly refresh.
    if (response.status >= 500 && attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      continue;
    }

    if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
    const payload = await response.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join("; "));
    return payload.data.user;
  }
}

/** 53 weeks of public contributions, drawn as a compact heat strip. */
function heatStrip(weeks, { x, y, cell = 9, gap = 3 }) {
  const counts = weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount));
  const peak = Math.max(1, ...counts);
  const ramp = [palette.surface, "#243a63", "#2f6f8f", palette.cyan, palette.violet];

  return weeks
    .map((week, wi) =>
      week.contributionDays
        .map((day, di) => {
          const level = day.contributionCount === 0 ? 0 : Math.min(4, 1 + Math.floor((day.contributionCount / peak) * 3));
          return `<rect x="${n(x + wi * (cell + gap))}" y="${n(y + di * (cell + gap))}" width="${cell}" height="${cell}" rx="2" fill="${ramp[level]}" fill-opacity="${level === 0 ? 0.5 : 0.95}"/>`;
        })
        .join(""),
    )
    .join("\n");
}

function tile({ x, y, width, value, label, accent }) {
  return `<g>
  <rect x="${x}" y="${y}" width="${width}" height="76" rx="10" fill="${palette.surface}" fill-opacity="0.55" stroke="${palette.line2}"/>
  <rect x="${x}" y="${y + 14}" width="3" height="48" rx="1.5" fill="${accent}"/>
  <text x="${x + 20}" y="${y + 38}" font-family="${font.display}" font-size="25" font-weight="700" fill="${palette.lumen}">${escapeText(value)}</text>
  <text x="${x + 20}" y="${y + 60}" font-family="${font.mono}" font-size="10.5" letter-spacing="0.09em" fill="${palette.lumen3}">${escapeText(label.toUpperCase())}</text>
</g>`;
}

function card(user) {
  const width = 900;
  const height = 300;
  const repos = user.repositories.nodes;
  const calendar = user.contributionsCollection.contributionCalendar;
  const weeks = calendar.weeks.slice(-53);
  const stars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);
  const languages = [...new Set(repos.map((r) => r.primaryLanguage?.name).filter(Boolean))];

  const tiles = [
    { value: String(user.repositories.totalCount), label: "public repositories", accent: palette.cyan },
    { value: String(calendar.totalContributions), label: "contributions · 12 mo", accent: palette.violet2 },
    { value: String(stars), label: "stars on public work", accent: palette.magenta },
    { value: String(languages.length), label: "languages in public", accent: palette.amber },
  ];

  const tileWidth = 192;
  const tileGap = 16;
  const tilesX = 40;

  const body = `<defs>
${fieldGradient(width, height)}
</defs>
${backdrop(width, height, { grid: 50 })}
<text x="40" y="36" font-family="${font.mono}" font-size="12" letter-spacing="0.22em" fill="${palette.lumen3}">ENGINEERING ACTIVITY</text>
${tiles.map((t, i) => tile({ ...t, x: tilesX + i * (tileWidth + tileGap), y: 56, width: tileWidth })).join("\n")}
<g>
${heatStrip(weeks, { x: 40, y: 158 })}
</g>
<text x="40" y="255" font-family="${font.mono}" font-size="11" fill="${palette.lumen3}">Public repositories only. The platforms I build professionally live in private repositories,</text>
<text x="40" y="272" font-family="${font.mono}" font-size="11" fill="${palette.lumen3}">so these numbers describe open work, not total output.</text>
<text x="${width - 40}" y="272" text-anchor="end" font-family="${font.mono}" font-size="10" fill="${palette.line2}">updated ${new Date().toISOString().slice(0, 10)}</text>`;

  return svg({
    width,
    height,
    title: "Public engineering activity",
    desc: `${user.repositories.totalCount} public repositories, ${calendar.totalContributions} public contributions in the last twelve months, ${stars} stars. Private professional repositories are not counted.`,
    body,
  });
}

const user = await fetchProfile();
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, "activity.svg"), card(user));
console.log("wrote assets/activity.svg");

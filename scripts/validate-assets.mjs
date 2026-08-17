/**
 * Guards every SVG in assets/ before it can be committed or published.
 *
 *   node scripts/validate-assets.mjs
 *
 * Checks that each file is a well-formed, self-contained, accessible SVG small
 * enough for a README. An SVG rendered inside an <img> cannot load external
 * resources or run scripts, so anything pointing outward is either dead weight
 * or a leak — both are failures here.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const assets = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const MAX_BYTES = 300 * 1024;

/** xmllint ships with macOS and most CI images; skip cleanly when it does not. */
function xmlWellFormed(file) {
  try {
    execFileSync("xmllint", ["--noout", file], { stdio: "pipe" });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    return false;
  }
}

const failures = [];
let parsedCount = 0;

for (const name of readdirSync(assets).filter((f) => f.endsWith(".svg"))) {
  const file = resolve(assets, name);
  const source = readFileSync(file, "utf8");
  const size = statSync(file).size;
  const before = failures.length;
  const fail = (reason) => failures.push(`${name}: ${reason}`);

  if (!source.startsWith("<svg")) fail("does not start with an <svg> element");
  if (!source.trimEnd().endsWith("</svg>")) fail("is not closed");
  if (!source.includes('viewBox="')) fail("has no viewBox, so it cannot scale");
  if (!source.includes("<title") || !source.includes("<desc")) fail("is missing <title> or <desc>");
  if (size > MAX_BYTES) fail(`is ${Math.round(size / 1024)}kB, over the ${MAX_BYTES / 1024}kB budget`);
  if (/<script/i.test(source)) fail("contains a <script>, which GitHub will not run and should not ship");
  if (/<(image|use)\b[^>]*href="https?:/i.test(source)) fail("pulls in an external resource");
  if (/\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(source)) {
    fail("contains something shaped like a GitHub token");
  }

  const wellFormed = xmlWellFormed(file);
  if (wellFormed === false) fail("is not well-formed XML");
  if (wellFormed === true) parsedCount += 1;

  if (failures.length === before) console.log(`ok  ${name} (${Math.round(size / 1024)}kB)`);
}

if (parsedCount === 0) {
  console.log("note: xmllint unavailable, structural checks only");
}

if (failures.length > 0) {
  console.error("\nasset validation failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nall assets valid");

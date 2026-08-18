# Agent OS session preflight

## Session — profile banners legible at phone and tablet width

- Repository: `/Users/kekkoiaf/Dev/github-public/francescoveryra-dot`
- Branch: `main`
- Remote: `git@github.com:francescoveryra-dot/francescoveryra-dot.git`
- Task classification: frontend/visual asset bugfix — README SVG banners
  illegible on mobile and tablet, and one banner rendering as overlapping text.
- Routing mode: **simulated** — Cursor executed the work directly; no real
  subagent was spawned.
- Owner agent (simulated): frontend-ui-engineer
- Reviewer agent (simulated): frontend-responsive-reviewer
- Supporting agent (simulated): product-design-reviewer
- Activated skills: frontend design system, frontend responsive review, visual
  quality review, agent-finish.
- Routing rationale: the defect is presentational and viewport-dependent — SVG
  banners drawn for desktop width and unreadable once GitHub scales them to a
  phone, plus one banner whose animation technique fails on mobile renderers.
  That is frontend/UI ownership with a responsive reviewer, not backend,
  security or infrastructure work. No AI, data, tenant or deploy surface is
  touched, so no further routing applies.
- Entrypoints inspected: `AGENTS.md` and `.cursor/rules/*` of the workspace
  Agent OS; this repository carries no Agent OS copy of its own.
- Files inspected: `README.md`, `assets/{hero,focus,systems,activity}.svg`,
  `scripts/{generate-assets,generate-activity,validate-assets}.mjs`,
  `scripts/lib/svg.mjs`.
- Stop conditions: no dependency changes, no token written into an asset, no
  edit to generated SVGs by hand (the generators are the source of truth), no
  change to the honesty caption on the activity card.

## Agent OS Preflight Compliance

- preflight executed before task: yes
- preflight type: complete-before-task
- required files present: yes
- missing files: none
- IDE adapter present: yes
- owner selected: yes
- reviewer selected: yes
- skills selected: yes
- stop conditions declared: yes
- agent-finish executed: not applicable — this repository has no
  `scripts/agent-finish.sh`; validation runs through
  `scripts/validate-assets.mjs`.
- result: OK
- may claim "Agent OS applicato": yes

### Architecture model decision

`single-instance-production` — a GitHub profile repository. No application, no
database, no tenants. The only published artefacts are the README and the SVGs
it embeds.

### Security trigger decision

- Security trigger detected: yes, narrowly.
- Reason: `scripts/generate-activity.mjs` reads a `GITHUB_TOKEN` from the
  environment to query public activity.
- Checks executed: `scripts/validate-assets.mjs`, which fails the build on any
  token-shaped string, external reference or `<script>` inside an asset;
  `git diff --check`.
- Result: OK. No credential is written into a committed file. Deploy allowed:
  yes — publication is the GitHub push itself.

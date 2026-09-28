# Project memory — Document Forgery Detection

Living notes on how this project works, why it is built the way it is, and the
traps already found. Read it before changing anything; update it when a
decision changes. **No secrets belong in this file** — env variable *names*
only, never values.

---

## 1. What it is

A document forgery detection app built for a college presentation.
Product model: **DOCUMENT → PAGE → EVIDENCE**. The user uploads an image of a
document page and gets:

1. **Localization** — a pixel-level evidence heatmap over the page.
2. **Tampering risk** — Low / Medium / High, from fixed rules on measurements
   of that heatmap.
3. **Interpretation** — a short AI-written reading of the single most
   significant region, clearly labelled as interpretation.

## 2. Architecture

| Part | Where | Notes |
|---|---|---|
| Frontend | `frontend/` — React 19, TypeScript, Vite 8, Tailwind v4, React Router 7 | Runs on the Windows PC. No ML in React. |
| Localization server | Separate Ubuntu machine on the LAN, reached through an ngrok tunnel | CAT-Net v2, `POST /predict`. **Do not modify, SSH into or install anything on it.** |
| Narrative service | `narrative-service/` — Node/Express, port 4000 | Computes heatmap metrics + risk level deterministically, then asks Gemini for the interpretation. |
| Auth, history, storage | Supabase | Row-level security; private Storage bucket; 7-day retention consent at sign-up. |

Environment variable names (values live in local `.env` files, never in Git):

- Frontend: `VITE_API_BASE_URL`, `VITE_NARRATIVE_BASE_URL`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_USE_MOCK_API`
- Narrative service: `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`

## 3. Running it

```bash
# narrative service (port 4000)
cd narrative-service && npm start

# frontend (http://localhost:5173)
cd frontend && npm run dev
```

The Ubuntu localization server and its tunnel must be up separately.

**Windows:** `lsof | xargs kill` silently fails here and leaves zombie
servers. Stop old servers with PowerShell:
`Stop-Process -Id <pid> -Force` (find the PID with `Get-NetTCPConnection -LocalPort 5173`).
After editing any `narrative-service/*.mjs`, restart that process — Vite
reloads itself, Node does not.

## 4. Product rules (non-negotiable)

- **Never invent results.** CAT-Net gives localization, not a fake/real
  verdict. No confidence %, no probability, no score derived from heatmap
  intensity.
- **Risk is shown as a level only** — the word, plus a three-segment marker
  that lights the one matching level. The numeric score, rule name and
  rationale stay in the payload and database but are never rendered.
- **Risk rule** lives in `narrative-service/metrics.mjs`. Peak intensity has
  the most weight (0.55) but is below the HIGH threshold (0.62), so peak alone
  can never make a document HIGH. A meaningful connected region at intensity
  ≥ 0.80 forces HIGH; a single hot pixel does not.
- **Interpretation** covers exactly one region (the most significant) with
  exactly one interpretation point. Rendered sections: "What the analysis
  shows" (numbered findings) and "Key finding" (a violet callout, "Most
  significant region"). Figures in the text (e.g. `0.92`, `1.92 percent`) are
  highlighted for scanning — presentation only, the text is never altered.
  The service still returns a `confidence` field; it is deliberately not shown.
- **Measured Evidence** is two groups of tiles — Intensity (peak, mean) and
  Spread (flagged area, regions, largest region, concentration) — each tile
  showing label, value exactly as formatted from the metrics, and a one-line
  explanation of how `metrics.mjs` computes it. Tiles the risk rule read carry
  a teal dot. Values are never drawn as bars or gauges.
- **Result panels open by default.** Interpretation and Measured Evidence are
  expanded whenever a result is shown; the rail is keyed by analysis id so a
  panel collapsed on one document never stays collapsed on the next.
- **Terminology:** no user-facing text may name CAT-Net, "the model", Gemini
  or Google. Internal identifiers keep their names.
- **Processing status** has two visible phases, keyed off
  `pages[0].catnet.heatmapUrl` (set before stage `NARRATIVE`):
  "Processing document" → "Evidence map ready · Generating interpretation…".
- **Dark mode only.** There is no light theme and there must not be one.

## 5. Design system (redesign, based on fourmula.ai's style)

Tokens are in `frontend/src/index.css` (`@theme`, Tailwind v4 — there is no
`tailwind.config.js`).

- Background `#020108`; panels `#111111`; raised `#18181d`; well `#0b0a10`
- Borders `#1d1d22` (hairline) / `#2a2a30` / `#3a3a42`
- Text: white at 100 / 64 / 50 / 30 % (`ink`, `ink-muted`, `ink-faint`, `ink-dim`)
- Meaning colours: evidence red `#ff5a54`, caution `#e0b04a`, safe `#4fcf8e`,
  accent teal `#5cc4b3` (state only), interpretation violet `#b0a6f5` (used for
  nothing else)
- Font: **Geist** / Geist Mono (the reference uses SF Pro Display, which is
  Apple-licensed and cannot be served on the web)
- Big type: hero 124px, section titles 104px, body 17px; tight negative
  letter-spacing on headings
- Shape: pill buttons (primary = solid white), rounded panels 28–48px, dot-grid
  backgrounds (`.dots`)
- Design canvas (Claude Design): https://claude.ai/artifact/VttrWiWgy6yqU1Ma5WXUuc

Only the *style* was taken from fourmula.ai — none of its images, logo, copy
or code.

## 6. Testing

```bash
cd frontend
npm test          # Vitest + Testing Library, 40 tests
npx tsc -b        # typecheck
npm run lint      # oxlint
npm run build
```

`frontend/src/test/app.test.tsx` covers: dark-only theme, landing (hero,
sections, four steps, view-mode tabs, FAQ, signed-in links, no forbidden
terms or percentages), nav bar, both processing phases, completed reading,
degraded interpretation, failed state, level-only risk, badges, legacy
narrative fallback, pane switch, history select + two-step delete, viewer
modes/zoom/reset, upload validation, auth forms. Auth, workspace and network
modules are mocked — the suite never calls Supabase or the servers.

Harness notes: Vitest blanks CSS imports unless listed in `test.css.include`;
Vitest's own `URL.createObjectURL` breaks on jsdom `File`s, so `setup.ts`
replaces it.

## 7. Known issues and gotchas

- **Gemini free tier is 20 requests/day.** When exhausted, analyses still
  complete (heatmap + risk) and show "Interpretation unavailable". Expected.
- `narrativeError` is not persisted to Supabase: a degraded analysis shows the
  notice live, but after a reload the section is simply absent. Pre-existing.
- Tailwind only generates classes it can read literally. Never build class
  names at runtime (`"text-x".replace(...)`) — use a literal map
  (see `src/lib/display.ts`).
- `.label` uses `text-transform: uppercase`, so `innerText` is uppercase.
  Browser tests must match case-insensitively.
- The production bundle is ~560 kB and Vite prints a chunk-size warning. It
  is a warning, not an error.
- Throwaway test accounts (`uitest+<timestamp>@docforensics.dev`) were
  created during UI verification; they can be removed from the Supabase
  dashboard.

## 8. Never commit

`.env` files, API keys (Gemini, Supabase service role), passwords, ngrok
tokens, uploaded or personal documents, generated sensitive images, local
databases with user data.

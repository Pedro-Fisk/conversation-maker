# Conversation Maker

Tool linked from the [fisk-hub](https://github.com/Pedro-Fisk/fisk-hub)
resource hub. Teachers pick a language, topic, optional grammar point and
level, and get the generated lesson content and slide plan.

**Hosted on Vercel** (not GitHub Pages) because content generation needs a
server-side function to call the Anthropic API without exposing the API
key to the browser. The static frontend and the `/api/generate-lesson`
function are deployed together from this same repo, so they share an
origin and no CORS setup is needed.

## Required setup (Vercel project settings, not in this repo)

Two environment variables must be set in the Vercel dashboard
(Project → Settings → Environment Variables) — never committed here:

- `ANTHROPIC_API_KEY` — from console.anthropic.com.
- `ACCESS_CODE` — shared password teachers enter in the form, to keep
  random visitors from burning API credits. Checked server-side in
  `api/generate-lesson.js`.

Note: changing an environment variable in the Vercel dashboard does not
update deployments that already exist — it only applies starting from the
next deployment. Push a new commit (or use "Redeploy" in the dashboard)
after adding/editing env vars for the change to take effect.

## Files

- `index.html` — the form (access code, language, topic, grammar point,
  level) + results page.
- `style.css` — FISK brand tokens (red/black/white), shared visual
  language with fisk-hub.
- `logic.js` — level rules and slide pagination (`buildSlidePlan`), used
  client-side on whatever lesson content the API returns. Also still
  contains `generateMock()`/`runRequest()` from the earlier preview-only
  version, unused by `app.js` now but handy for offline testing.
- `app.js` — DOM wiring: reads the form, calls `POST /api/generate-lesson`,
  shows loading/error state, paginates and renders the result, and wires
  the "Baixar .pptx" button (`POST /api/export-pptx`) on each deck.
- `api/generate-lesson.js` — Vercel serverless function. Checks the access
  code, calls the Anthropic Messages API once per requested level (1, or 3
  for "all levels"), reuses objectives/vocabulary across levels the same
  way the Python prototype does, and returns lesson JSON.
- `pptx-builder.js` — turns a `{ lesson, slidePlan }` pair into a real
  `.pptx` file (via `pptxgenjs`). One call = one deck/level, matching the
  site-wide rule that levels are never merged into a single deck. Visual
  style is a single consistent FISK red/black/white template applied to
  every generated topic — the hand-made curriculum decks use bespoke
  per-unit photography and color palettes that aren't practical to
  replicate for an arbitrary AI-generated topic, so this keeps the real
  decks' *structure* (banner bars, panel titles, fixed section order)
  without trying to fake their curated art direction.
- `api/export-pptx.js` — Vercel serverless function. Takes the
  already-generated `{ lesson, slidePlan }` from the browser (no AI call,
  no extra API cost) and streams back the `.pptx` binary as a download.

## Getting a generated lesson into Canva

`.pptx` files can be dragged into Canva (or imported via a public URL) to
become a fully editable Canva design. There's no automated pipeline for
this yet — a teacher downloads the `.pptx` from the site, then either
imports it into Canva themselves, or asks whoever manages the shared
"Conversation Maker" Canva folder to do it. A fully hands-off version of
this (the site uploading straight to a shared Canva folder with no manual
step) would need a proper Canva Connect API integration (OAuth on the
Vercel backend) — bigger scope, not built yet.

## Local testing without spending API credits

Open `index.html` directly — the access-code field will just fail (no
`/api` route without Vercel running), but `window.ConversationMaker.runRequest(...)`
from `logic.js` still works from the browser console if you want to sanity
check pagination against mock content.

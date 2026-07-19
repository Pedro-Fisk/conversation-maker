# Conversation Maker

Tool linked from the [fisk-hub](https://github.com/Pedro-Fisk/fisk-hub)
resource hub. Teachers pick a language, topic and level, and get back a
polished, ready-to-use lesson deck as a real PDF and/or `.pptx` — generated
server-side onto Pedro's actual Canva template (not a re-created lookalike).

**Hosted on Vercel** (not GitHub Pages) because content generation needs a
server-side function to call the Anthropic API without exposing the API
key to the browser, and PDF/PPTX rendering needs a real Node runtime
(headless Chromium for the PDF, `pptxgenjs` for the PPTX). The static
frontend and the `/api/*` functions are deployed together from this same
repo, so they share an origin and no CORS setup is needed.

## The template

Every lesson — any level, either language — is rendered onto the SAME
18-page Canva template (design `DAHPwZYsMkA`, brand template `EAHP3MbB56Y`):
cover, agenda, objectives (3), vocabulary (8 words), introduction (1
paragraph), conversation (9 Q&As across 3 pages), language game (6 Q&As
across 2 pages), evaluation (2 Q&As), closing. Only the *content* — question
depth, vocabulary difficulty, register, and for Spanish, the language
itself — scales with level; the structure and page count never change.
This is Pedro's call: one template, reused everywhere, rather than a
different layout per level.

The real background PNGs (exported directly from Canva, not screenshots)
live in `assets/bg/`. `slide-layouts.js` is the single source of truth for
where every piece of text sits on each page (captured from the template's
own element coordinates), shared by both exporters so the PDF and PPTX
always match.

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

- `index.html` / `style.css` — the form (access code, language, topic,
  level) + results page. FISK brand tokens (red/black/white).
- `app.js` — DOM wiring: reads the form, calls `POST /api/generate-lesson`,
  shows a compact text read-out of each generated lesson, and wires
  "Baixar PDF" (`POST /api/export-pdf`) and "Baixar .pptx"
  (`POST /api/export-pptx`) on each deck.
- `api/generate-lesson.js` — Vercel serverless function. Checks the access
  code, calls the Anthropic Messages API once per requested level (1, or 3
  for "todos os níveis"), and always returns the canonical fixed-shape
  lesson JSON described below — objectives/vocabulary are kept identical
  across a multi-level batch so the decks describe the same lesson at
  different depths.
- `slide-layouts.js` — the 18-page coordinate map (position, font, size for
  every field on every page), captured from the real Canva template.
- `lesson-data.js` — tiny shared helpers (`getQaItems`, `buildDynamicValue`)
  for pulling values out of a lesson object, used by both exporters so they
  can't drift apart on how a field maps to lesson data.
- `render-slides-html.js` — turns a lesson into one self-contained HTML
  document (18 pages) using the real background PNGs + `slide-layouts.js`.
  Documents the canonical lesson shape at the top of the file.
- `api/export-pdf.js` — Vercel serverless function. Renders that HTML with
  headless Chromium (`puppeteer-core` + `@sparticuz/chromium`) and streams
  back a PDF.
- `pptx-builder.js` — builds a real `.pptx` using the same backgrounds and
  the same `slide-layouts.js` coordinates (converted px → inches), so it
  stays visually consistent with the PDF.
- `api/export-pptx.js` — Vercel serverless function wrapping
  `pptx-builder.js`.
- `logic.js` — deprecated, no longer loaded. Left for reference only (see
  the comment at the top of the file).

## Canonical lesson shape

Both exporters expect exactly this shape (see the full comment in
`render-slides-html.js`):

```
{
  coverTitle, coverLevel, topic,
  objectives: [string, string, string],
  vocabulary: [{ word, translation }] × 8,
  introText: string,                          // one paragraph
  conversation: [{ question, modelAnswers: [string, string] }] × 9,
  languageGame: [{ question, modelAnswers: [string, string] }] × 6,
  evaluation: [{ question, modelAnswers: [string, string] }] × 2,
}
```

## Adding more Canva templates later

Right now `slide-layouts.js` points at one template's backgrounds. If Pedro
ever wants a visually different template for a specific level/language
instead of reusing this one, the swap point is `LAYOUTS[].bg` (point at a
new `assets/bg/` set) plus new coordinates — the lesson shape and both
exporters stay the same.

## Local testing without spending API credits

- `node test-render.js` — builds `preview.html` (all 18 pages, one HTML
  file) from the shared mock lesson in `test-render-lesson.js`.
- `node test-pptx.js` — builds `test-output.pptx` from the same mock
  lesson.
- `node qa-dump.js && python3 qa_render.py` — rough Pillow-based
  approximate render used to sanity-check font sizes/overflow before a
  real browser is available to test against (see the comments in
  `qa_render.py`); final fidelity is verified in the real Chromium-rendered
  PDF once deployed.

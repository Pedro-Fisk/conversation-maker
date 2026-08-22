# Conversation Maker

Tool linked from the [fisk-hub](https://github.com/Pedro-Fisk/fisk-hub)
resource hub. Teachers pick a language, topic and level, and get back a
polished, ready-to-use lesson deck as a real `.pptx` — generated
server-side onto Pedro's actual Canva template (not a re-created lookalike).

**Hosted on Vercel** (not GitHub Pages) because content generation needs a
server-side function to call the Anthropic API without exposing the API
key to the browser, and PPTX rendering needs a real Node runtime
(`pptxgenjs`). The static
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
own element coordinates), shared by the PPTX exporter and the local HTML
preview so they always match.

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
  shows a compact editable read-out of each generated lesson, and wires
  "Baixar .pptx" (`POST /api/export-pptx`) on each deck.
- `api/generate-lesson.js` — Vercel serverless function. Checks the access
  code, calls the Anthropic Messages API once per requested level (1, or 3
  for "todos os níveis"), and always returns the canonical fixed-shape
  lesson JSON described below — objectives/vocabulary are kept identical
  across a multi-level batch so the decks describe the same lesson at
  different depths.
- `slide-layouts.js` — the 18-page coordinate map (position, font, size for
  every field on every page), captured from the real Canva template.
- `lesson-data.js` — shared helpers used by BOTH exporters so they can't
  drift apart. Three jobs: what each field's value is (`buildDynamicValue`),
  which LANGUAGE the template's fixed texts come out in (`textoEstatico`),
  and which FONT SIZE actually fits the box (`maiorFonteQueCabe` and
  friends). See the two blocks below.

### Fixed texts and the language of the deck (21/08/2026)

The template carries text that does not come from the AI: the cover badge,
the section dividers, the agenda, the closing line. It used to be written
in English straight into `slide-layouts.js`, so a SPANISH lesson came out
with those pieces in English and the teacher fixed them by hand every time.
Each fixed text now declares its Spanish twin next to it (`valueEs`), and
`textoEstatico` picks by `lesson.language`. Put the pair on the same lines
when adding a new fixed text — `test-espanhol-e-caixas.js` fails if any
static field is missing its `valueEs`.

The other half of that bug lived in the prompt: the Spanish instruction
LISTED the fields to translate, so anything not on the list (cover title,
intro paragraph, extra activity) came back in English by omission. There is
now a single global rule for Spanish covering every field, with the
vocabulary `translation` as the one deliberate exception (it stays in
Brazilian Portuguese, because the students are Brazilian).

### Font sizes that fit (21/08/2026)

Fixed box + variable content = overflow. Measured before the fix: the
vocabulary slide needed 977px inside a 793px box, and the intro box used
59% of the slide width at a fixed 38px, leaving half the slide empty.

A field can now declare `fit: { max, min }`, and the renderers pick the
largest size where that lesson's text fits that box. Every `max` equals the
template's old fixed size, so a lesson that already fitted looks exactly as
it did; only the long ones shrink. The estimate uses the average character
width measured in Poppins itself (0.50-0.53 of the font size, Spanish being
the widest) rounded up to 0.55, so it errs toward shrinking. It is an
estimate and not a measurement because the .pptx is built in Node with no
browser to measure text, and PowerPoint's own "shrink text on overflow"
only recalculates when a human edits the box — on first open the text would
still spill.
- `render-slides-html.js` — turns a lesson into one self-contained HTML
  document (18 pages) using the real background PNGs + `slide-layouts.js`.
  Documents the canonical lesson shape at the top of the file. Used only
  for local QA previews (`test-render.js`) — there is no PDF export.
- `pptx-builder.js` — builds a real `.pptx` using the same backgrounds and
  the same `slide-layouts.js` coordinates (converted px → inches), so it
  stays visually consistent with the HTML preview.
- `api/export-pptx.js` — Vercel serverless function wrapping
  `pptx-builder.js`.
- `pptx-rewriter.js` — the other end of "upload an activity you already
  use": instead of harvesting its text and building a FISK deck, it hands
  the teacher **their own file back**, design untouched, with the text
  rewritten. See the block below.
- `api/rewrite-pptx.js` + `rewrite-generation.js` — the server half of that
  mode: it receives only the extracted text, asks the model to rewrite it,
  and returns a map of `id -> new text`. It never sees the file.
- `logic.js` — deprecated, no longer loaded.

### Keeping the teacher's own design (21/08/2026)

The decision that makes this work is to **map nothing**. There is no
correspondence between their slides and any template of ours: every text box
that is already in their file gets new text, exactly where it already sits.
That is why the number of slides, their order, and whether the deck looks
anything like ours are all irrelevant — the fear that made this feature look
hard turns out to be the part that disappears.

A .pptx is a ZIP of XMLs. We read the ZIP by hand (`DecompressionStream` and
`CompressionStream` are native in both Chrome and Node), swap the contents of
the `<a:t>` markers inside `ppt/slides/slideN.xml`, and rebuild the ZIP
**copying every unchanged entry still compressed** — the images, which are
the weight of the file, are never even decompressed. Everything that is not
text comes out byte for byte identical.

Two implementation choices worth keeping:

- **Splice the XML text, don't rebuild a DOM.** Re-serializing a DOM rewrites
  namespaces, attributes and whitespace across the whole file, and PowerPoint
  is picky. Splicing only the text ranges leaves everything else untouched —
  and, as a bonus, no `DOMParser` means the same file runs in the browser and
  in Node, which is what makes it testable at all.
- **A paragraph's new text goes into its FIRST run**, and the other runs of
  that paragraph are emptied. PowerPoint splits a single sentence across
  several runs for its own reasons (spell-check state, one italic word, the
  run's language), and distributing new text across them would be guesswork.

Known limits, all surfaced in the UI before the teacher spends a credit: the
box does not grow (the prompt is given each text's length and told to stay
within ~15%), text baked into an image cannot change, and the rewritten file
is not backed up to Drive the way generated decks are, since it is assembled
in the browser and never reaches the server.

`node test-pptx-rewrite.js` covers this end to end, including three ZIP
variants real files use (stored entries, a trailing comment, data
descriptors) and a round trip validated by an independent reader. Left for reference only (see
  the comment at the top of the file).

## Canonical lesson shape

The PPTX exporter and the HTML preview expect exactly this shape (see the
full comment in `render-slides-html.js`):

```
{
  coverTitle, coverLevel, topic,
  coverEmoji,                                 // one emoji for the topic ("" if none)
  sectionEmojis: { objectives, vocabulary, intro,
                   conversation, languageGame, evaluation },
  objectives: [string, string, string],
  vocabulary: [{ word, translation }] × 8,
  introText: string,                          // one paragraph
  conversation: [{ question, modelAnswers: [string, string] }] × 9,
  languageGame: [{ question, options: [3], correctIndex }] × 6,
  evaluation: [{ question, modelAnswers: [string, string] }] × 2,
}
```

The emojis live in fields of their own and are **never** baked into
`coverTitle` — the downloaded file name is built from `coverTitle`, and it
has to stay free of emoji. Both renderers prepend them at render time
(`buildDynamicValue` / `emojiDaSecao` in `lesson-data.js`).

## Adding more Canva templates later

Right now `slide-layouts.js` points at one template's backgrounds. If Pedro
ever wants a visually different template for a specific level/language
instead of reusing this one, the swap point is `LAYOUTS[].bg` (point at a
new `assets/bg/` set) plus new coordinates — the lesson shape and the
exporter stay the same.

## Local testing without spending API credits

- `node test-render.js` — builds `preview.html` AND `preview-es.html` (all
  20 pages each, one self-contained HTML file per language) from the mock
  lessons in `test-render-lesson.js` and `test-render-lesson-es.js`. Add
  `--leve` for small files that pull the backgrounds from a local server
  instead of embedding them (handy when a 24 MB page is too heavy to open).
- `node test-pptx.js` — builds `test-output.pptx` from the English mock;
  `node test-pptx.js --es` builds the Spanish one.
- `node test-espanhol-e-caixas.js` — 60 checks over the two silent bugs:
  English text left in a Spanish deck, and text overflowing its box.
- `node test-nivel-x-idade.js` — 18 checks keeping linguistic level and
  cognitive demand as two separate axes in the prompt.
- `node test-pptx-rewrite.js` — 47 checks on rewriting a teacher's own
  .pptx: the XML scan, the ZIP round trip, the file staying valid, and the
  rules of the rewrite prompt. Needs `test-output.pptx` (run `node
  test-pptx.js` first).
- `node qa-dump.js && python3 qa_render.py` — rough Pillow-based
  approximate render used to sanity-check font sizes/overflow before a
  real browser is available to test against (see the comments in
  `qa_render.py`); final fidelity is verified in the exported `.pptx`
  once deployed.

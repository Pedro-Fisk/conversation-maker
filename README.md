# Conversation Maker

Static tool (GitHub Pages, no backend) linked from the [fisk-hub](https://github.com/Pedro-Fisk/fisk-hub)
resource hub. Teachers pick a language, topic, optional grammar point and
level, and get a preview of the generated lesson structure.

**Current status: preview / mock mode.** `logic.js` is a JavaScript port of
the Python prototype in `fisk-hub/conversation_maker/` (same level rules,
subtopic grouping, scaffolding by level, shared objectives/vocabulary
across levels). It stands in for a real Claude API call — a static GitHub
Pages site can't call the Anthropic API directly without exposing the API
key, so real generation will need a small backend/proxy function later.
Swapping `generateMock()` for a real API call is the only change needed;
the form, pagination and rendering stay the same.

## Files

- `index.html` — the form + results page.
- `style.css` — FISK brand tokens (red/black/white), shared visual
  language with fisk-hub.
- `logic.js` — content generation + slide pagination (mock for now).
- `app.js` — DOM wiring: reads the form, calls `ConversationMaker.runRequest`,
  renders the slide-by-slide preview.

## Try it

Open `index.html` directly in a browser (no build step, no server needed).

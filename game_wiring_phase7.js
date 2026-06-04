// ═══════════════════════════════════════════════════════════════════════════
// game.js  —  Phase 7 wiring guide
// Apply these four changes to your existing game.js.
// Each block is labelled with WHERE to put it.
// ═══════════════════════════════════════════════════════════════════════════


// ── CHANGE 1 ─────────────────────────────────────────────────────────────
// LOCATION: inside your image-preload / init section, AFTER state[] is
//           populated and canvas is ready — typically after the last
//           `state[i].facadeImg.onload` resolves or your Promise.all().
//
// ADD:
Screens.init(canvas, ctx, state, levels);


// ── CHANGE 2 ─────────────────────────────────────────────────────────────
// LOCATION: replace (or wrap) the place where the game currently just
//           starts rendering level 0 on page load.
//
// BEFORE (typical existing code):
//   startLevel(0);          // or however you kick off level 0
//
// AFTER:
Screens.showCinematic(0, () => {
  startLevel(0);
});
// The callback fires the moment the camera lands on facade_01 and the
// cinematic ends — then your normal startLevel() takes over.


// ── CHANGE 3 ─────────────────────────────────────────────────────────────
// LOCATION: inside your level-completion handler — wherever you currently
//           call startLevel(nextIndex) or advance to the next facade.
//
// BEFORE:
//   startLevel(nextIndex);
//
// AFTER:
Screens.showCinematic(nextIndex, () => {
  startLevel(nextIndex);
});
// Same pattern: cinematic scrolls the preview facades then lands on
// the next unfound level; your startLevel() fires in the callback.


// ── CHANGE 4 ─────────────────────────────────────────────────────────────
// LOCATION: your pointer/touch event handler (pointerdown / touchstart /
//           mousedown — whichever you use for tap detection).
//
// ADD at the very TOP of the handler, before any tap-logic:
if (Screens.handleCinematicTap(x, y)) return;
// This swallows the tap during the cinematic so the player can't
// accidentally trigger a fox-found event while the scroll is playing.


// ═══════════════════════════════════════════════════════════════════════════
// That's the complete wiring — four locations, ~1 line each.
//
// screens.js draws the facades using the same state[] + levels[] data
// already loaded by game.js, so no extra assets or network requests.
// ═══════════════════════════════════════════════════════════════════════════

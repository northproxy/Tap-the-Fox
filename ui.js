// === Tap the Fox — ui.js ===
// Draws the completion screen on top of the canvas.
// game.js calls showCompletionScreen() when all foxes are found.

// ─── Completion screen ───────────────────────────────────────────
// Fades in a dark overlay with a congratulations card and restart button.
// The restart button calls restartGame() which lives in game.js.

let completionAlpha = 0;       // 0 = invisible, 1 = fully visible
let completionVisible = false;

function showCompletionScreen() {
  completionVisible = true;
  completionAlpha   = 0;

  const startTime = performance.now();
  const duration  = 600; // fade-in duration (ms)

  function fadeIn(now) {
    completionAlpha = Math.min((now - startTime) / duration, 1);
    draw();                      // game.js draw() — redraws everything
    drawCompletionScreen();      // then we draw UI on top
    if (completionAlpha < 1) {
      requestAnimationFrame(fadeIn);
    }
  }
  requestAnimationFrame(fadeIn);
}

function drawCompletionScreen() {
  if (!completionVisible) return;

  const W = canvas.width;
  const H = canvas.height;

  // --- Dark overlay ---
  ctx.save();
  ctx.globalAlpha = completionAlpha * 0.78;
  ctx.fillStyle   = '#0f0804';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // --- Card dimensions ---
  const cardW = Math.min(W * 0.82, 380);
  const cardH = 300;
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;

  ctx.save();
  ctx.globalAlpha = completionAlpha;

  // Card background
  ctx.fillStyle = '#2a1a08';
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();

  // Card border
  ctx.strokeStyle = '#c87820';
  ctx.lineWidth   = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.stroke();

  // Fox emoji — large
  ctx.font      = `${Math.round(cardW * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🦊', W / 2, cardY + cardH * 0.27);

  // Heading
  ctx.fillStyle = '#fff8e1';
  ctx.font      = `bold ${Math.round(cardW * 0.09)}px sans-serif`;
  ctx.fillText('All foxes found!', W / 2, cardY + cardH * 0.47);

  // Subtext
  ctx.fillStyle = '#c8a06a';
  ctx.font      = `${Math.round(cardW * 0.065)}px sans-serif`;
  ctx.fillText(`${levels.length} / ${levels.length} hidden foxes`, W / 2, cardY + cardH * 0.61);

  // --- Restart button ---
  const btnW  = cardW * 0.62;
  const btnH  = 50;
  const btnX  = (W - btnW) / 2;
  const btnY  = cardY + cardH * 0.73;

  ctx.fillStyle = '#e07818';
  roundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = '#fff8e1';
  ctx.font      = `bold ${Math.round(btnW * 0.1)}px sans-serif`;
  ctx.fillText('Play again', W / 2, btnY + btnH * 0.64);

  // Store button bounds so click handler can detect taps on it
  restartButton = { x: btnX, y: btnY, w: btnW, h: btnH };

  ctx.restore();
}

// ─── Restart button hit detection ───────────────────────────────
// game.js tap handler calls this when completionVisible is true.
let restartButton = null;

function handleCompletionTap(screenX, screenY) {
  if (!completionVisible || !restartButton) return false;
  const b = restartButton;
  if (
    screenX >= b.x && screenX <= b.x + b.w &&
    screenY >= b.y && screenY <= b.y + b.h
  ) {
    completionVisible = false;
    restartButton     = null;
    restartGame();   // defined in game.js
    return true;     // tap was consumed
  }
  return false;
}

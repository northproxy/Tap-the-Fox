// === Tap the Fox — levels.js ===
// Add or edit your levels here. game.js reads this automatically.
//
// foxX / foxY     — position of the fox inside the facade image (pixels)
// foxWidth/Height — how large to draw the fox image
// hitboxWidth/Height — the tappable area (keep this larger than the fox image)

const levels = [
    {
      facade:       'assets/facades/facade_01.jpg',
      fox:          'assets/foxes/fox_01.png',
      foxX:         520,
      foxY:         340,
      foxWidth:     120,
      foxHeight:    120,
      hitboxWidth:  200,
      hitboxHeight: 200,
      hint:         'Look near the upper windows.',
    },
    {
      facade:       'assets/facades/facade_02.jpg',
      fox:          'assets/foxes/fox_02.png',
      foxX:         280,
      foxY:         500,
      foxWidth:     100,
      foxHeight:    100,
      hitboxWidth:  180,
      hitboxHeight: 180,
      hint:         'Check near the doorway.',
    },
    {
      facade:       'assets/facades/facade_03.jpg',
      fox:          'assets/foxes/fox_03.png',
      foxX:         700,
      foxY:         200,
      foxWidth:     130,
      foxHeight:    130,
      hitboxWidth:  220,
      hitboxHeight: 220,
      hint:         'Something orange near the balcony.',
    },
  ];
"use strict";

function makeFireflies(salt) {
  const r = stream(salt);
  const count = 55;
  const motes = [];
  for (let i = 0; i < count; i++) {
    const homeX = r() * VW;
    const homeY = HORIZON - 40 + r() * (VH - HORIZON - 40);
    const driftRadius = 12 + r() * 28;
    const orbitPhase = r() * TAU;
    const orbitSpeed = 0.3 + r() * 0.5;
    const blinkRate = 1.5 + r() * 2.5;
    const blinkPhase = r() * TAU;
    const size = 2.5 + r() * 3.5;
    const depth = 0.3 + r() * 0.5;
    motes.push({
      homeX, homeY,
      driftRadius, orbitPhase, orbitSpeed,
      blinkRate, blinkPhase,
      size, depth
    });
  }

  // Bake glow sprite: radial gradient canvas (sunCore center -> transparent)
  const spriteSize = 64;
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = spriteSize;
  glowCanvas.height = spriteSize;
  const g = glowCanvas.getContext('2d');
  const cx = spriteSize / 2, cy = spriteSize / 2;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, spriteSize / 2);
  grad.addColorStop(0, PAL.sunCore);
  grad.addColorStop(0.15, PAL.floraGold);
  grad.addColorStop(0.5, 'rgba(244,192,74,0.3)');
  grad.addColorStop(1, 'rgba(244,192,74,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, spriteSize, spriteSize);

  return { motes, glowCanvas, spriteSize };
}

function drawFireflies(g, state, cam, t) {
  const { motes, glowCanvas, spriteSize } = state;
  const half = spriteSize / 2;

  g.save();
  g.globalCompositeOperation = 'lighter';

  for (const mote of motes) {
    // Lissajous wander
    const easedT = t * mote.orbitSpeed + mote.orbitPhase;
    const dx = Math.cos(easedT) * mote.driftRadius;
    const dy = Math.sin(easedT * 0.7 + 0.5) * mote.driftRadius * 0.6;
    const sx = mote.homeX + dx - cam * mote.depth;
    const sy = mote.homeY + dy;

    // Wrap horizontally
    const wrappedX = ((sx % VW) + VW) % VW;
    if (wrappedX < -half || wrappedX > VW + half) continue;

    // Blink alpha
    const blink = 0.5 + 0.5 * Math.sin(t * mote.blinkRate + mote.blinkPhase);
    const alpha = 0.3 + 0.7 * blink;

    g.globalAlpha = alpha;
    const scale = mote.size / half;
    g.drawImage(glowCanvas, wrappedX - half * scale, sy - half * scale, spriteSize * scale, spriteSize * scale);
  }

  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.restore();
}
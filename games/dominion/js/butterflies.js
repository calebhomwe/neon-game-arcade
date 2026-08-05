function makeButterflies(salt) {
  const r = stream(salt);
  const count = 9;
  const butterflies = [];

  for (let i = 0; i < count; i++) {
    // Base position in flower band
    const baseX = r() * WORLDW;
    const baseY = HORIZON + 30 + r() * (VH - 60 - HORIZON - 30);

    // Lissajous drift parameters
    const driftAmpX = 20 + r() * 40;
    const driftAmpY = 10 + r() * 25;
    const freqX = 0.3 + r() * 0.5;
    const freqY = 0.4 + r() * 0.6;
    const phaseX = r() * TAU;
    const phaseY = r() * TAU;

    // Wing flap
    const flapRate = 3 + r() * 4;
    const flapPhase = r() * TAU;

    // Size and color
    const size = 12 + r() * 8;
    const color = r() < 0.5 ? PAL.floraRose : (r() < 0.5 ? PAL.floraGold : PAL.sunCore);

    // Depth for parallax (closer to horizon = further back)
    const depth = 0.4 + r() * 0.3;

    // Bake wing sprite (two elliptical petals)
    const wingSize = Math.ceil(size * 1.2);
    const wingCanvas = document.createElement('canvas');
    wingCanvas.width = wingSize * 2;
    wingCanvas.height = wingSize;
    const wg = wingCanvas.getContext('2d');

    // Left wing
    wg.fillStyle = color;
    wg.globalAlpha = 0.85;
    wg.beginPath();
    wg.ellipse(wingSize * 0.4, wingSize * 0.5, wingSize * 0.45, wingSize * 0.3, -0.3, 0, TAU);
    wg.fill();

    // Right wing
    wg.beginPath();
    wg.ellipse(wingSize * 1.6, wingSize * 0.5, wingSize * 0.45, wingSize * 0.3, 0.3, 0, TAU);
    wg.fill();

    // Wing vein detail (subtle lines)
    wg.strokeStyle = 'rgba(0,0,0,0.15)';
    wg.lineWidth = 0.8;
    for (let side = 0; side < 2; side++) {
      const cx = side === 0 ? wingSize * 0.4 : wingSize * 1.6;
      const angle = side === 0 ? -0.3 : 0.3;
      wg.save();
      wg.translate(cx, wingSize * 0.5);
      wg.rotate(angle);
      for (let j = 0; j < 3; j++) {
        const vx = (j - 1) * wingSize * 0.15;
        const vy = -wingSize * 0.2;
        wg.beginPath();
        wg.moveTo(0, 0);
        wg.lineTo(vx, vy);
        wg.stroke();
      }
      wg.restore();
    }

    butterflies.push({
      baseX, baseY,
      driftAmpX, driftAmpY,
      freqX, freqY,
      phaseX, phaseY,
      flapRate, flapPhase,
      size, color, depth,
      wingCanvas, wingSize
    });
  }

  return { butterflies };
}

function drawButterflies(g, state, cam, t) {
  const { butterflies } = state;

  for (const b of butterflies) {
    // Lissajous drift
    const dx = Math.sin(t * b.freqX + b.phaseX) * b.driftAmpX;
    const dy = Math.sin(t * b.freqY + b.phaseY) * b.driftAmpY;

    // World position with parallax
    let wx = b.baseX + dx - cam * b.depth;
    wx = ((wx % WORLDW) + WORLDW) % WORLDW;

    const wy = b.baseY + dy;

    // Screen bounds check
    if (wx < -b.size * 2 || wx > VW + b.size * 2) continue;
    if (wy < -b.size * 2 || wy > VH + b.size * 2) continue;

    // Wing flap factor (0..1)
    const flap = Math.abs(Math.sin(t * b.flapRate + b.flapPhase));

    // Y-bob for organic feel
    const bob = Math.sin(t * 1.2 + b.flapPhase * 0.7) * 2;

    g.save();
    g.translate(wx, wy + bob);

    // Draw body (small dark line)
    g.strokeStyle = '#2a1f14';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -b.size * 0.1);
    g.lineTo(0, b.size * 0.15);
    g.stroke();

    // Draw wings scaled by flap
    const wingScale = 0.3 + 0.7 * flap;
    const halfW = b.wingSize;
    const halfH = b.wingSize * 0.5;

    // Left wing
    g.save();
    g.translate(-b.size * 0.15, 0);
    g.scale(wingScale, 1);
    g.drawImage(b.wingCanvas, -halfW, -halfH, b.wingSize * 2, b.wingSize);
    g.restore();

    // Right wing (mirrored)
    g.save();
    g.translate(b.size * 0.15, 0);
    g.scale(wingScale, 1);
    g.scale(-1, 1);
    g.drawImage(b.wingCanvas, -halfW, -halfH, b.wingSize * 2, b.wingSize);
    g.restore();

    g.restore();
  }
}
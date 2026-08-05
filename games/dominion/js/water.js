function makeWater(salt) {
  const rng = stream(salt);
  const cx = 640 + (rng() - 0.5) * 200; // center x
  const cy = HORIZON + 90 + (rng() - 0.5) * 40; // center y
  const rx = 190 + rng() * 40; // horizontal radius
  const ry = 60 + rng() * 20; // vertical radius

  // Bake ripple normal/height texture (tileable)
  const TEX = 128;
  const noise = makeNoise(salt ^ 0xDEAD);
  const rippleTex = document.createElement('canvas');
  rippleTex.width = TEX;
  rippleTex.height = TEX;
  const rg = rippleTex.getContext('2d');
  const img = rg.createImageData(TEX, TEX);
  const d = img.data;
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const u = x / TEX, v = y / TEX;
      // fBm height
      const h = fbm((u, v) => noise(u, v), x * 0.15, y * 0.15, 4, 2.0, 0.55);
      // encode as normal-ish: store height in R, G/B for normal hint
      const val = Math.floor(clamp(h * 255, 0, 255));
      const i = (y * TEX + x) * 4;
      d[i] = val;     // height
      d[i+1] = 128;   // placeholder normal x
      d[i+2] = 128;   // placeholder normal y
      d[i+3] = 255;
    }
  }
  rg.putImageData(img, 0, 0);

  return {
    cx, cy, rx, ry,
    rippleTex,
    phase: rng() * TAU,
    speed: 0.8 + rng() * 0.4,
    amp: 0.3 + rng() * 0.2,
    freq: 0.02 + rng() * 0.01,
    glintPhase: rng() * TAU
  };
}

function drawWater(g, state, cam, t) {
  const { cx, cy, rx, ry, rippleTex, phase, speed, amp, freq, glintPhase } = state;
  const sx = ((cx - cam * 0.6) % WORLDW + WORLDW) % WORLDW;

  // Clip to pond ellipse
  g.save();
  g.beginPath();
  g.ellipse(sx, cy, rx, ry, 0, 0, TAU);
  g.clip();

  // Base gradient: sky reflection
  const grad = g.createLinearGradient(sx, cy - ry, sx, cy + ry);
  grad.addColorStop(0, PAL.skyMid);
  grad.addColorStop(0.5, mix(PAL.skyMid, PAL.hills[3], 0.4));
  grad.addColorStop(1, PAL.hills[3]);
  g.fillStyle = grad;
  g.fillRect(sx - rx, cy - ry, rx * 2, ry * 2);

  // Ripple lines (summed sines)
  g.globalAlpha = 0.3;
  g.strokeStyle = 'rgba(255,255,255,0.15)';
  g.lineWidth = 1.5;
  const numLines = 12;
  for (let i = 0; i < numLines; i++) {
    const yOff = (i / numLines) * ry * 2 - ry;
    g.beginPath();
    for (let x = -rx; x <= rx; x += 4) {
      const nx = x / rx;
      const ny = yOff / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist > 1) continue;
      const ripple = Math.sin(x * freq + t * speed + phase + i * 0.8) * amp
                   + Math.sin(x * freq * 1.7 + t * speed * 0.6 + phase * 1.3 + i * 1.2) * amp * 0.5;
      const yy = cy + yOff + ripple * 6;
      if (x === -rx) g.moveTo(sx + x, yy);
      else g.lineTo(sx + x, yy);
    }
    g.stroke();
  }
  g.globalAlpha = 1;

  // Specular glints near sun side
  const sunX = VW * 0.72;
  const sunY = HORIZON * 0.42;
  const dx = sunX - sx;
  const dy = sunY - cy;
  const angle = Math.atan2(dy, dx);
  const glintDist = rx * 0.6;
  const glintX = sx + Math.cos(angle) * glintDist;
  const glintY = cy + Math.sin(angle) * glintDist * 0.5;

  const glintAlpha = 0.3 + 0.4 * Math.sin(t * 1.2 + glintPhase);
  g.globalAlpha = glintAlpha;
  g.fillStyle = PAL.sunCore;
  for (let i = 0; i < 5; i++) {
    const offX = Math.cos(t * 0.7 + i * 1.3) * 8;
    const offY = Math.sin(t * 0.9 + i * 1.7) * 4;
    g.beginPath();
    g.ellipse(glintX + offX, glintY + offY, 3 + Math.sin(t + i) * 2, 1.5, angle, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;

  // Soft fog rim where water meets land
  const fogGrad = g.createRadialGradient(sx, cy, ry * 0.7, sx, cy, ry);
  fogGrad.addColorStop(0, 'rgba(201,179,154,0)');
  fogGrad.addColorStop(1, 'rgba(201,179,154,0.35)');
  g.fillStyle = fogGrad;
  g.fillRect(sx - rx, cy - ry, rx * 2, ry * 2);

  g.restore();
}
function makeForeground(salt) {
  const r = stream(salt);
  const blades = [];
  const spacing = 14; // dense coverage
  const cols = Math.ceil(WORLDW / spacing) + 4;
  
  for (let col = 0; col < cols; col++) {
    const baseX = col * spacing + (r() - 0.5) * spacing * 0.6;
    const height = 80 + r() * 110; // 80-190px
    const width = 3 + r() * 5;
    const curve = (r() - 0.5) * 0.6; // quadratic bend factor
    const colorT = r(); // lerp between groundDeep and canopyDeep
    const phase = r() * TAU;
    const swayRate = 0.7 + r() * 0.5;
    const swayAmp = 0.04 + r() * 0.04;
    
    blades.push({
      x: baseX,
      height,
      width,
      curve,
      colorT,
      phase,
      swayRate,
      swayAmp
    });
  }
  
  return { blades };
}

function drawForeground(g, state, cam, t) {
  const { blades } = state;
  const parallax = 1.15;
  
  for (const blade of blades) {
    // Parallax wrap
    let sx = blade.x - cam * parallax;
    sx = ((sx % WORLDW) + WORLDW) % WORLDW;
    // Map to screen space (world wraps to screen)
    const screenX = (sx / WORLDW) * VW;
    
    // Skip if off screen with margin
    if (screenX < -20 || screenX > VW + 20) continue;
    
    // Sway at tip
    const sway = Math.sin(t * blade.swayRate + blade.phase + blade.x * 0.01) * blade.swayAmp;
    
    // Color: dark silhouette
    const color = mix(PAL.groundDeep, PAL.canopyDeep, blade.colorT);
    g.fillStyle = color;
    g.strokeStyle = color;
    g.lineWidth = blade.width;
    g.lineCap = 'round';
    
    // Draw blade as quadratic curve from base to tip
    const baseY = VH;
    const tipY = VH - blade.height;
    const midY = VH - blade.height * 0.5;
    const midX = screenX + blade.curve * blade.height * 0.3 + sway * blade.height * 0.15;
    
    g.beginPath();
    g.moveTo(screenX, baseY);
    g.quadraticCurveTo(midX, midY, screenX + sway * blade.height * 0.2, tipY);
    g.stroke();
    
    // Add slight thickness variation by drawing a second thinner line offset
    g.lineWidth = blade.width * 0.4;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.moveTo(screenX + 1, baseY);
    g.quadraticCurveTo(midX + 1, midY + 2, screenX + sway * blade.height * 0.2 + 1, tipY + 1);
    g.stroke();
    g.globalAlpha = 1;
  }
}
function makeGodshafts(salt) {
  const r = stream(salt);
  const count = 6;
  const beams = [];
  const sunX = 0.72 * VW;
  const sunY = 0.42 * HORIZON;
  
  for (let i = 0; i < count; i++) {
    // Seeded angle: fan down-left from sun, range roughly -0.6 to -1.2 radians (down-left)
    const angle = -0.6 - r() * 0.6;
    // Width: 30-80 px
    const width = 30 + r() * 50;
    // Length: 200-500 px
    const length = 200 + r() * 300;
    // Phase for breathing
    const phase = r() * TAU;
    // Base alpha between 0.05 and 0.12
    const baseAlpha = 0.05 + r() * 0.07;
    // Sway amplitude (radians)
    const swayAmp = 0.02 + r() * 0.03;
    // Slow rate for breathing
    const slowRate = 0.3 + r() * 0.4;
    
    // Bake gradient canvas for this beam
    const texSize = Math.ceil(Math.max(width, length) * 1.2);
    const cv = document.createElement('canvas');
    cv.width = texSize;
    cv.height = texSize;
    const g = cv.getContext('2d');
    
    // Draw beam as a long thin quadrilateral: from origin (center-left) to length direction
    // We'll draw a rotated rectangle with gradient
    const cx = texSize / 2;
    const cy = texSize / 2;
    
    // Create linear gradient along the beam direction (from origin outward)
    // Beam direction: angle points down-left, so gradient from top-right to bottom-left
    const gradAngle = angle + Math.PI; // reverse direction for gradient
    const gx = Math.cos(gradAngle) * length * 0.5;
    const gy = Math.sin(gradAngle) * length * 0.5;
    
    const grad = g.createLinearGradient(cx - gx, cy - gy, cx + gx, cy + gy);
    grad.addColorStop(0, PAL.sunCore);
    grad.addColorStop(0.3, PAL.godray);
    grad.addColorStop(1, 'rgba(255,210,122,0)');
    
    g.fillStyle = grad;
    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    // Draw rectangle: width along perpendicular, length along angle
    g.fillRect(-width / 2, -length / 2, width, length);
    g.restore();
    
    beams.push({
      angle,
      width,
      length,
      phase,
      baseAlpha,
      swayAmp,
      slowRate,
      canvas: cv,
      texSize
    });
  }
  
  return {
    beams,
    sunX,
    sunY
  };
}

function drawGodshafts(g, state, cam, t) {
  const { beams, sunX, sunY } = state;
  
  g.save();
  g.globalCompositeOperation = 'lighter';
  
  for (const beam of beams) {
    // Breathing alpha
    const breath = 0.5 + 0.5 * Math.sin(t * beam.slowRate + beam.phase);
    const alpha = beam.baseAlpha * (0.7 + 0.3 * breath);
    
    // Angle sway
    const sway = Math.sin(t * beam.slowRate * 0.5 + beam.phase * 1.3) * beam.swayAmp;
    const currentAngle = beam.angle + sway;
    
    g.globalAlpha = alpha;
    
    // Position: origin at sun, then offset along beam direction
    const halfLen = beam.length * 0.5;
    const dx = Math.cos(currentAngle) * halfLen;
    const dy = Math.sin(currentAngle) * halfLen;
    
    // Draw beam centered at sun + half-length offset (so it extends from sun outward)
    const px = sunX + dx;
    const py = sunY + dy;
    
    g.save();
    g.translate(px, py);
    g.rotate(currentAngle);
    g.drawImage(beam.canvas, -beam.texSize / 2, -beam.texSize / 2);
    g.restore();
  }
  
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.restore();
}
/* =========================================================
   光影绘梦师 — procedural ink-wash artwork
   ========================================================= */
(function () {
  const L = window.Lumen;
  const A = L.Art = {};
  const TAU = Math.PI * 2;

  /* ------------------------- helpers ------------------------- */
  A.tint = function (gray, accent, amt, strength) {
    return L.mixHex(gray, L.desat(accent, 0.08), L.clamp(amt, 0, 1) * (strength == null ? 0.62 : strength));
  };

  function pathFromPoly(pts) {
    const p = new Path2D();
    p.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
    p.closePath();
    return p;
  }

  function traceSmooth(ctx, pts, from, to) {
    const a = from || 0, b = to == null ? pts.length - 1 : to;
    if (b <= a) return;
    ctx.moveTo(pts[a].x, pts[a].y);
    for (let i = a; i < b; i++) {
      const p = pts[i], n = pts[i + 1];
      const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, mx, my);
    }
    const last = pts[b];
    ctx.lineTo(last.x, last.y);
  }
  A.traceSmooth = traceSmooth;

  function makeRidge(rng, x0, x1, baseY, amp, step, p, color, alpha) {
    const pts = [];
    const phase = rng() * 10;
    for (let x = x0; x <= x1; x += step) {
      const y = baseY
        + Math.sin(x * 0.0035 + phase) * amp * 0.55
        + Math.sin(x * 0.011 + phase * 2.3) * amp * 0.22
        + (rng() - 0.5) * amp * 0.3;
      pts.push({ x, y });
    }
    // soften
    for (let k = 0; k < 2; k++) {
      for (let i = 1; i < pts.length - 1; i++) {
        pts[i].y = (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4;
      }
    }
    const outline = [{ x: x0, y: baseY + 900 }, ...pts, { x: x1, y: baseY + 900 }];
    return { pts, path: pathFromPoly(outline), p, color, alpha };
  }

  function makePeaks(rng, x0, x1, baseY, amp, p, color, alpha) {
    const pts = [{ x: x0, y: baseY + 900 }];
    let x = x0;
    while (x < x1) {
      const step = 130 + rng() * 240;
      const peak = baseY - (0.35 + rng() * 0.75) * amp;
      pts.push({ x, y: baseY - rng() * amp * 0.16 });
      pts.push({ x: x + step * (0.35 + rng() * 0.25), y: peak });
      pts.push({ x: x + step, y: baseY - rng() * amp * 0.22 });
      x += step;
    }
    pts.push({ x: x1, y: baseY + 900 });
    return { path: pathFromPoly(pts), p, color, alpha };
  }

  function makeCliff(rng, side, w, h, p, color, edgeX) {
    const pts = [{ x: side < 0 ? -900 : w + 200, y: -400 }];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const y = -400 + (h + 900) * (i / n);
      const wob = Math.sin(i * 1.7 + rng() * 0.4) * 26 + (rng() - 0.5) * 26;
      const x = edgeX + wob + Math.sin(i * 0.25) * 40;
      pts.push({ x, y });
    }
    const top = side < 0 ? { x: -900, y: h + 500 } : { x: w + 200, y: h + 500 };
    pts.push(top);
    return { pts, path: pathFromPoly(pts), p, color };
  }

  /* ------------------------- scene building ------------------------- */
  A.build = function (level) {
    const rng = L.mulberry32(level.seed);
    const w = level.bounds.w, h = level.bounds.h;
    const scene = {
      theme: level.theme,
      peaks: [],
      ridges: [],
      trees: [],
      towers: [],
      islands: [],
      arches: [],
      cliffs: [],
      stars: [],
      clouds: [],
      moon: null,
      pagoda: null,
      torii: null,
      birds: [],
      lanterns: [],
      mists: [],
      windSeeds: []
    };

    if (level.theme === 'field') {
      scene.peaks.push(makePeaks(rng, -1800, w + 2600, 636, 210, 0.035, '#f1ebe0', 0.85));
      scene.ridges.push(makeRidge(rng, -1800, w + 2600, 590, 62, 86, 0.06, '#ece5d8', 0.9));
      scene.ridges.push(makeRidge(rng, -1800, w + 2600, 660, 54, 74, 0.14, '#e1d9ca', 0.92));
      scene.ridges.push(makeRidge(rng, -1800, w + 2600, 730, 42, 64, 0.24, '#d3cabb', 0.94));
      for (let i = 0; i < 20; i++) {
        const x = -400 + rng() * (w + 1200);
        scene.trees.push({ x, y: 760 + rng() * 60, h: 34 + rng() * 70, p: 0.2, seed: rng() * 10 });
      }
      for (let i = 0; i < 12; i++) {
        const x = -300 + rng() * (w + 1000);
        scene.trees.push({ x, y: 800 + rng() * 50, h: 26 + rng() * 42, p: 0.3, seed: rng() * 10 });
      }
      scene.groundTrees = [
        { x: 340, y: 1000, h: 92, seed: 1 },
        { x: 1440, y: 1000, h: 136, seed: 2 },
        { x: 2330, y: 780, h: 150, seed: 3 }
      ];
      scene.pagoda = { x: 2120, y: 790, h: 150, p: 0.16 };
      scene.moon = { sx: 0.76, sy: 0.2, r: 88 };
      for (let i = 0; i < 5; i++) scene.birds.push({ x: rng(), y: 0.2 + rng() * 0.2, s: 4 + rng() * 3, ph: rng() * 10 });
      for (let i = 0; i < 6; i++) {
        scene.clouds.push({ x: rng(), y: 0.12 + rng() * 0.3, w: 220 + rng() * 300, h: 22 + rng() * 30, p: 0.05, ph: rng() * 10, alpha: 0.4 + rng() * 0.18 });
      }
    }

    if (level.theme === 'cliff') {
      scene.peaks.push(makePeaks(rng, -1400, w + 1800, 1520, 900, 0.022, '#eae4d9', 0.8));
      scene.peaks.push(makePeaks(rng, -1400, w + 1800, 1780, 520, 0.05, '#ded7ca', 0.85));
      scene.ridges.push(makeRidge(rng, -1800, w + 2200, 1720, 60, 80, 0.06, '#e4dfd5', 0.55));
      scene.cliffs.push(makeCliff(rng, -1, w, h, 0.2, '#d2cabd', 170));
      scene.cliffs.push(makeCliff(rng, 1, w, h, 0.2, '#d2cabd', w - 170));
      scene.cliffs.push(makeCliff(rng, -1, w, h, 0.38, '#b7afa1', 30));
      scene.cliffs.push(makeCliff(rng, 1, w, h, 0.38, '#b7afa1', w - 30));
      scene.moon = { sx: 0.55, sy: 0.16, r: 76 };
      for (let i = 0; i < 14; i++) {
        const x = -300 + rng() * (w + 600);
        scene.trees.push({ x, y: 800 + rng() * 80, h: 18 + rng() * 30, p: 0.2, seed: rng() * 10, far: true });
      }
      for (let i = 0; i < 8; i++) {
        scene.islands.push({ x: -100 + rng() * (w + 400), y: 950 + rng() * 900, rx: 32 + rng() * 64, ry: 12 + rng() * 16, p: 0.28 + rng() * 0.18, seed: rng() * 10, rock: true });
      }
      for (let i = 0; i < 7; i++) scene.birds.push({ x: rng(), y: 0.14 + rng() * 0.3, s: 3 + rng() * 2, ph: rng() * 10 });
      for (let i = 0; i < 5; i++) {
        scene.clouds.push({ x: rng(), y: 0.26 + rng() * 0.34, w: 220 + rng() * 260, h: 22 + rng() * 26, p: 0.05, ph: rng() * 10, alpha: 0.28 });
      }
      for (let i = 0; i < 6; i++) {
        scene.lanterns.push({ x: 120 + rng() * (w - 240), y: 900 + rng() * 900, ph: rng() * 10, p: 0.25 });
      }
    }

    if (level.theme === 'mist') {
      scene.peaks.push(makePeaks(rng, -1600, w + 2400, 880, 300, 0.028, '#eef1ec', 0.6));
      scene.ridges.push(makeRidge(rng, -1600, w + 2400, 660, 40, 100, 0.06, '#e9ebe6', 0.7));
      scene.ridges.push(makeRidge(rng, -1600, w + 2400, 770, 30, 90, 0.12, '#dadfd9', 0.62));
      for (let i = 0; i < 34; i++) {
        const x = -400 + rng() * (w + 800);
        scene.trees.push({ x, y: 800 + rng() * 40, h: 60 + rng() * 150, p: 0.22, seed: rng() * 10, dead: true });
      }
      scene.groundTrees = [
        { x: 380, y: 1040, h: 148, seed: 11, dead: true },
        { x: 2010, y: 1040, h: 120, seed: 12, dead: true },
        { x: 2740, y: 920, h: 176, seed: 13, dead: true }
      ];
      scene.moon = { sx: 0.66, sy: 0.2, r: 62, faint: true };
      for (let i = 0; i < 8; i++) {
        scene.lanterns.push({ x: -200 + rng() * (w + 400), y: 300 + rng() * 500, ph: rng() * 10, p: 0.14 });
      }
      for (let i = 0; i < 5; i++) {
        scene.clouds.push({ x: rng(), y: 0.16 + rng() * 0.32, w: 260 + rng() * 320, h: 24 + rng() * 28, p: 0.05, ph: rng() * 10, alpha: 0.22 });
      }
    }

    if (level.theme === 'tower') {
      scene.moon = { sx: 0.7, sy: 0.15, r: 118 };
      for (let i = 0; i < 110; i++) {
        scene.stars.push({ x: rng(), y: rng() * 0.72, r: 0.6 + rng() * 1.5, ph: rng() * 10 });
      }
      for (let i = 0; i < 7; i++) {
        const x = -400 + rng() * (w + 900);
        scene.towers.push({ x, y: 2360, h: 340 + rng() * 720, w: 54 + rng() * 60, p: 0.1 + rng() * 0.12, seed: rng() * 10 });
      }
      for (let i = 0; i < 9; i++) {
        scene.islands.push({ x: -200 + rng() * (w + 600), y: 700 + rng() * 1200, rx: 30 + rng() * 55, ry: 12 + rng() * 16, p: 0.3 + rng() * 0.16, seed: rng() * 10, rock: true });
      }
      scene.bigTower = { x: 1000, y: 2360, h: 640, w: 170, p: 0.13 };
      scene.bigTower2 = { x: 250, y: 2360, h: 420, w: 90, p: 0.2 };
      for (let i = 0; i < 5; i++) scene.clouds.push({ x: rng(), y: 0.28 + rng() * 0.4, w: 180 + rng() * 260, h: 26 + rng() * 36, p: 0.06, ph: rng() * 10, alpha: 0.16 });
    }

    if (level.theme === 'bloom') {
      scene.moon = { sx: 0.8, sy: 0.22, r: 132, warm: true };
      for (let i = 0; i < 80; i++) {
        scene.stars.push({ x: rng(), y: rng() * 0.65, r: 0.5 + rng() * 1.4, ph: rng() * 10 });
      }
      scene.peaks.push(makePeaks(rng, -1600, w + 2600, 780, 220, 0.03, '#f3e9e2', 0.6));
      scene.ridges.push(makeRidge(rng, -1600, w + 2600, 700, 40, 100, 0.05, '#e6dfdf', 0.55));
      for (let i = 0; i < 3; i++) {
        scene.arches.push({ sx: 0.66, sy: 0.33, r: 220 + i * 56, color: level.palette[i + 3], alpha: 0.2 - i * 0.03 });
      }
      scene.torii = { x: 3000, y: 760, s: 1.35, p: 1 };
      for (let i = 0; i < 10; i++) {
        scene.clouds.push({ x: rng(), y: 0.2 + rng() * 0.5, w: 220 + rng() * 300, h: 30 + rng() * 40, p: 0.04, ph: rng() * 10, alpha: 0.16 });
      }
      scene.groundTrees = [
        { x: 320, y: 1080, h: 126, seed: 21, blossom: true },
        { x: 2660, y: 760, h: 164, seed: 22, blossom: true },
        { x: 3150, y: 760, h: 108, seed: 23, blossom: true }
      ];
      scene.groundTorii = { x: 650, y: 1080, s: 0.72, p: 1 };
    }

    // mist wisps
    level.mists.forEach((zone, zi) => {
      const wr = L.mulberry32(level.seed + 77 + zi * 13);
      const arr = [];
      for (let i = 0; i < 11; i++) {
        arr.push({
          x: zone.x + wr() * zone.w,
          y: zone.y + wr() * zone.h,
          rx: 140 + wr() * 220,
          ry: 50 + wr() * 90,
          ph: wr() * TAU,
          sp: 0.08 + wr() * 0.14,
          a: 0.16 + wr() * 0.2
        });
      }
      scene.mists.push(arr);
    });

    // wind streaks
    level.winds.forEach((zone, zi) => {
      const wr = L.mulberry32(level.seed + 311 + zi * 7);
      const arr = [];
      for (let i = 0; i < 26; i++) {
        arr.push({
          y: zone.y + wr() * zone.h,
          x: wr() * (zone.w + 300),
          len: 50 + wr() * 150,
          sp: 0.4 + wr() * 0.8,
          a: 0.06 + wr() * 0.12,
          ph: wr() * TAU
        });
      }
      scene.windSeeds.push(arr);
    });

    return scene;
  };

  /* ------------------------- paper & sky ------------------------- */
  A._grain = null;
  A._makeGrain = function () {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random();
      img.data[i] = 55; img.data[i + 1] = 48; img.data[i + 2] = 40;
      img.data[i + 3] = v < 0.55 ? 0 : Math.floor(v * 16);
    }
    x.putImageData(img, 0, 0);
    // fibres
    x.strokeStyle = 'rgba(80,68,52,0.05)';
    x.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const px = Math.random() * 256, py = Math.random() * 256;
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.random() * 16 - 8, py + Math.random() * 16 - 8, px + Math.random() * 30 - 15, py + Math.random() * 30 - 15);
      x.stroke();
    }
    return c;
  };

  A.drawPaper = function (ctx, w, h, level, time, colorAmt) {
    colorAmt = colorAmt || 0;
    const dark = level.theme === 'tower';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, level.bg[0]);
    g.addColorStop(0.62, level.bg[1]);
    g.addColorStop(1, dark ? '#b4b8c1' : L.mixHex(level.bg[1], '#cfc6b6', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // light bloom
    const light = ctx.createRadialGradient(w * 0.3, h * 0.1, 10, w * 0.3, h * 0.1, h * 0.95);
    light.addColorStop(0, dark ? 'rgba(238,244,255,0.24)' : 'rgba(255,250,235,0.5)');
    light.addColorStop(1, dark ? 'rgba(238,244,255,0)' : 'rgba(255,250,235,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    // the returning colour, like a soft watercolour wash over the whole sheet
    if (colorAmt > 0.015) {
      const wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, '#63b3ff');
      wash.addColorStop(0.34, '#b98cff');
      wash.addColorStop(0.64, '#ffce8a');
      wash.addColorStop(1, '#ff9a8a');
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.9 * colorAmt;
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.16 * colorAmt;
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (!A._grain) A._grain = A._makeGrain();
    const pat = ctx.createPattern(A._grain, 'repeat');
    ctx.save();
    ctx.globalAlpha = dark ? 0.35 : 0.55;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  A.drawSky = function (ctx, scene, cam, view, time, colorAmt, level) {
    const w = view.w, h = view.h;

    if (scene.moon) {
      const m = scene.moon;
      const mx = w * m.sx - cam.x * 0.012;
      const my = h * m.sy - cam.y * 0.012;
      const warm = m.warm ? '#ffe6b8' : '#f7f2e6';
      let col;
      if (m.faint) col = '#eeeee7';
      else if (m.warm) col = L.mixHex('#faf6ec', '#ffd39a', colorAmt);
      else col = L.mixHex('#faf6ec', '#fff2c9', colorAmt * 0.55);
      const glowCol = L.mixHex(warm, '#ffcf8a', colorAmt * 0.8);
      const halo = ctx.createRadialGradient(mx, my, m.r * 0.2, mx, my, m.r * 2.9);
      halo.addColorStop(0, L.rgba(glowCol, 0.35 + colorAmt * 0.2));
      halo.addColorStop(0.45, L.rgba(glowCol, 0.1));
      halo.addColorStop(1, L.rgba(glowCol, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(mx, my, m.r * 2.9, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(mx, my, m.r, 0, TAU); ctx.fill();
      // faint, asymmetric moon texture (never a face)
      ctx.save();
      ctx.globalAlpha = 0.07;
      const craters = [
        [-0.34, -0.18, 0.16], [0.2, 0.28, 0.12], [-0.05, 0.44, 0.08],
        [0.42, -0.3, 0.07], [-0.46, 0.3, 0.05], [0.05, -0.45, 0.09]
      ];
      craters.forEach((c, i) => {
        ctx.fillStyle = i % 2 ? '#9d9484' : '#ffffff';
        ctx.beginPath();
        ctx.arc(mx + c[0] * m.r, my + c[1] * m.r, c[2] * m.r, 0, TAU);
        ctx.fill();
      });
      ctx.restore();
      if (m.warm) {
        const g2 = ctx.createRadialGradient(mx, my, m.r * 0.9, mx, my, m.r * 1.8);
        g2.addColorStop(0, L.rgba('#ffcf8a', 0.18));
        g2.addColorStop(1, L.rgba('#ffcf8a', 0));
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(mx, my, m.r * 1.8, 0, TAU); ctx.fill();
      }
    }

    if (scene.stars.length) {
      for (const s of scene.stars) {
        const tw = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.ph));
        const x = s.x * w - cam.x * 0.008;
        const y = s.y * h - cam.y * 0.008;
        ctx.globalAlpha = tw * (0.55 + colorAmt * 0.35);
        ctx.fillStyle = colorAmt > 0.35 ? (s.r > 1.5 ? '#fff1c9' : '#eef7ff') : '#fffdf1';
        if (s.r > 1.55) {
          ctx.beginPath();
          ctx.arc(x, y, s.r * 3.2, 0, TAU);
          ctx.fillStyle = 'rgba(255,253,241,0.08)';
          ctx.fill();
          ctx.fillStyle = '#fffdf1';
        }
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (scene.arches) {
      for (const a of scene.arches) {
        const ax = a.sx * w - cam.x * 0.01, ay = a.sy * h;
        ctx.save();
        ctx.globalAlpha = a.alpha * (0.35 + colorAmt * 0.65);
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(ax, ay + a.r * 1.7, a.r, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (scene.clouds) {
      for (const c of scene.clouds) {
        const cx = ((c.x * w + time * 4 * c.p * 10 + c.ph * 40) % (w + c.w * 2)) - c.w;
        const cy = c.y * h - cam.y * 0.02;
        ctx.save();
        ctx.globalAlpha = c.alpha * (0.5 + colorAmt * 0.2);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.w * 0.5);
        g.addColorStop(0, 'rgba(255,255,252,0.95)');
        g.addColorStop(0.5, 'rgba(255,255,250,0.62)');
        g.addColorStop(1, 'rgba(255,255,250,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, c.w * 0.5, c.h, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - c.w * 0.18, cy + c.h * 0.2, c.w * 0.32, c.h * 0.8, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  A.drawAmbient = function (ctx, scene, cam, view, time, colorAmt, level) {
    const w = view.w, h = view.h;
    // drifting dust
    const n = scene.theme === 'tower' ? 24 : 18;
    for (let i = 0; i < n; i++) {
      const ph = i * 2.399;
      const x = ((i * 137.5 + time * (5 + (i % 4) * 3)) % (w + 100)) - 50;
      const y = ((Math.sin(time * 0.3 + ph) * 0.5 + 0.5) * h * 0.85 + (i * 53) % 120) % h;
      const a = (0.08 + 0.1 * (0.5 + 0.5 * Math.sin(time + ph))) * (1 - (scene.theme === 'mist' ? 0.4 : 0));
      ctx.globalAlpha = a;
      ctx.fillStyle = scene.theme === 'mist' ? '#ffffff' : '#7a7468';
      ctx.beginPath(); ctx.arc(x, y, 1.1 + (i % 3) * 0.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // birds
    for (const b of scene.birds) {
      const x = ((b.x * w + time * 8 + 40) % (w + 200)) - 100;
      const y = b.y * h + Math.sin(time * 0.8 + b.ph) * 6;
      ctx.strokeStyle = 'rgba(60,58,54,0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - b.s, y);
      ctx.quadraticCurveTo(x - b.s * 0.5, y - b.s * 0.55, x, y - b.s * 0.1);
      ctx.quadraticCurveTo(x + b.s * 0.5, y - b.s * 0.55, x + b.s, y);
      ctx.stroke();
    }

    if (scene.theme === 'bloom' || (level && level.index === 4)) {
      const cols = level.palette;
      for (let i = 0; i < 26; i++) {
        const ph = i * 1.77;
        const x = ((i * 191 + time * (8 + (i % 3) * 4)) % (w + 120)) - 60;
        const y = ((i * 97 + time * (12 + (i % 5) * 3)) % (h + 100)) - 50;
        if (y < 0) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 0.8 + ph);
        ctx.globalAlpha = 0.35 + (colorAmt * 0.45);
        ctx.fillStyle = cols[(i + 2) % cols.length];
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    if (scene.theme === 'mist' || scene.theme === 'tower') {
      for (let i = 0; i < 12; i++) {
        const ph = i * 2.1;
        const x = ((i * 211 + time * (10 + i % 4)) % (w + 80)) - 40;
        const y = h * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.45 + ph)));
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2 + ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 3 ? '#f9f4d8' : L.rgba(level.palette[i % level.palette.length], 1);
        ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };

  /* ------------------------- parallax scenery ------------------------- */
  A.drawParallax = function (ctx, scene, cam, time, colorAmt, level) {
    const palette = level.palette;
    for (let i = 0; i < scene.peaks.length; i++) {
      const r = scene.peaks[i];
      ctx.save();
      ctx.translate(cam.x * (1 - r.p), cam.y * (1 - r.p) * 0.6);
      ctx.fillStyle = A.tint(r.color, palette[(i + 4) % palette.length], colorAmt, 0.68);
      ctx.globalAlpha = r.alpha;
      ctx.fill(r.path);
      ctx.restore();
    }
    for (let i = 0; i < scene.ridges.length; i++) {
      const r = scene.ridges[i];
      const accent = palette[(i + 4) % palette.length];
      ctx.save();
      ctx.translate(cam.x * (1 - r.p), cam.y * (1 - r.p) * 0.55);
      ctx.fillStyle = A.tint(r.color, accent, colorAmt, 0.82);
      ctx.globalAlpha = r.alpha;
      ctx.fill(r.path);
      ctx.restore();
    }

    // distant pagoda
    if (scene.pagoda) {
      const p = scene.pagoda;
      ctx.save();
      ctx.translate(cam.x * (1 - p.p), 0);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = A.tint('#cfc7b9', palette[0], colorAmt, 0.3);
      const x = p.x, y = p.y, hh = p.h;
      ctx.fillRect(x - 14, y - hh * 0.45, 28, hh * 0.45);
      for (let k = 0; k < 4; k++) {
        const ww = 58 - k * 9, yy = y - hh * (0.45 + k * 0.14);
        ctx.beginPath();
        ctx.moveTo(x - ww, yy);
        ctx.quadraticCurveTo(x, yy - 16, x + ww, yy);
        ctx.quadraticCurveTo(x, yy + 5, x - ww, yy);
        ctx.fill();
      }
      ctx.fillRect(x - 1.5, y - hh - 18, 3, 22);
      ctx.restore();
    }

    // stars handled in sky; towers/islands/trees next
    if (scene.towers.length) {
      if (scene.bigTower) A.drawBigTower(ctx, scene.bigTower, cam, colorAmt, level, 0.55);
      if (scene.bigTower2) A.drawBigTower(ctx, scene.bigTower2, cam, colorAmt, level, 0.38);
      for (const t of scene.towers) {
        ctx.save();
        ctx.translate(cam.x * (1 - t.p), cam.y * (1 - t.p) * 0.4);
        const x = t.x, y = t.y, hh = t.h, ww = t.w;
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = A.tint('#d3cdc4', palette[1], colorAmt, 0.35);
        ctx.beginPath();
        ctx.moveTo(x - ww * 0.28, y);
        ctx.lineTo(x - ww * 0.2, y - hh);
        ctx.lineTo(x + ww * 0.2, y - hh);
        ctx.lineTo(x + ww * 0.28, y);
        ctx.closePath();
        ctx.fill();
        // roof
        ctx.beginPath();
        ctx.moveTo(x - ww * 0.6, y - hh);
        ctx.quadraticCurveTo(x, y - hh - 70, x + ww * 0.6, y - hh);
        ctx.quadraticCurveTo(x, y - hh + 18, x - ww * 0.6, y - hh);
        ctx.fill();
        // windows
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#fff9e8';
        for (let k = 0; k < 5; k++) {
          const wy = y - hh * (0.2 + k * 0.16);
          if (k % 2 === 0) ctx.fillRect(x - ww * 0.14, wy, ww * 0.28, 3);
        }
        ctx.restore();
      }
    }

    if (scene.islands.length) {
      for (const isl of scene.islands) {
        ctx.save();
        ctx.translate(cam.x * (1 - isl.p), cam.y * (1 - isl.p) * 0.5);
        ctx.globalAlpha = isl.rock ? 0.72 : 0.55;
        const col = isl.rock ? A.tint('#a7a094', palette[2], colorAmt, 0.4) : A.tint('#d8d1c4', palette[2], colorAmt, 0.35);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(isl.x, isl.y, isl.rx, isl.ry, 0, 0, TAU);
        ctx.fill();
        if (isl.rock) {
          const rng = L.mulberry32(isl.seed * 97 + 5);
          ctx.beginPath();
          ctx.moveTo(isl.x - isl.rx * 0.92, isl.y + isl.ry * 0.2);
          ctx.quadraticCurveTo(isl.x - isl.rx * 0.62, isl.y + isl.ry * 1.1, isl.x - isl.rx * 0.18, isl.y + isl.ry * (1.2 + rng() * 0.5));
          ctx.lineTo(isl.x + isl.rx * 0.08, isl.y + isl.ry * (2.1 + rng() * 0.8));
          ctx.lineTo(isl.x + isl.rx * 0.3, isl.y + isl.ry * (1.15 + rng() * 0.4));
          ctx.quadraticCurveTo(isl.x + isl.rx * 0.7, isl.y + isl.ry * 0.95, isl.x + isl.rx * 0.92, isl.y + isl.ry * 0.2);
          ctx.closePath();
          ctx.fill();
          // striations
          ctx.globalAlpha *= 0.35;
          ctx.strokeStyle = '#f6efdf';
          ctx.lineWidth = 1;
          for (let k = 0; k < 3; k++) {
            const u = (k - 1) * 0.35;
            ctx.beginPath();
            ctx.moveTo(isl.x + u * isl.rx, isl.y + isl.ry * 0.4);
            ctx.lineTo(isl.x + (u + 0.06) * isl.rx, isl.y + isl.ry * (1 + rng()));
            ctx.stroke();
          }
          ctx.globalAlpha = isl.rock ? 0.72 : 0.55;
          // moss rim
          ctx.strokeStyle = 'rgba(245,240,225,0.28)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(isl.x, isl.y - 1, isl.rx * 0.94, isl.ry * 0.8, 0, Math.PI, TAU);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(isl.x - isl.rx * 0.7, isl.y + isl.ry * 0.5);
          ctx.lineTo(isl.x, isl.y + isl.ry * 2.6);
          ctx.lineTo(isl.x + isl.rx * 0.55, isl.y + isl.ry * 0.45);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // trees
    for (const t of scene.trees) {
      ctx.save();
      ctx.translate(cam.x * (1 - t.p), cam.y * (1 - t.p) * 0.5);
      ctx.globalAlpha = t.far ? 0.3 : 0.55;
      const baseCol = t.dead ? '#a5a29a' : '#bfb7a8';
      ctx.strokeStyle = A.tint(baseCol, palette[0], colorAmt, 0.5);
      ctx.fillStyle = ctx.strokeStyle;
      const x = t.x, y = t.y, hh = t.h;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.sin(t.seed) * 6, y - hh * 0.6, x + Math.sin(t.seed) * 3, y - hh);
      ctx.stroke();
      if (!t.dead) {
        // canopy
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(x + (k - 1) * hh * 0.16, y - hh * (0.78 + (k === 1 ? 0.12 : 0)), hh * 0.24, hh * 0.16, 0, 0, TAU);
          ctx.fill();
        }
      } else {
        for (let k = 0; k < 4; k++) {
          const by = y - hh * (0.35 + k * 0.16);
          const dir = k % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(x, by);
          ctx.quadraticCurveTo(x + dir * hh * 0.18, by - 8, x + dir * hh * (0.3 + k * 0.03), by - 14);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ground-level trees sit behind the ink platforms
    if (scene.groundTrees) {
      for (const t of scene.groundTrees) A.drawGroundTree(ctx, t, level, time, colorAmt);
    }

    if (scene.cliffs.length) {
      for (const c of scene.cliffs) {
        ctx.save();
        ctx.translate(cam.x * (1 - c.p), cam.y * (1 - c.p) * 0.3);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = A.tint(c.color, level.palette[1], colorAmt, 0.25);
        ctx.fill(c.path);
        // strata / rock grain
        ctx.save();
        ctx.clip(c.path);
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#fffaf0';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 16; k++) {
          const y = -300 + k * 190 + Math.sin(k) * 30;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(80, y + 22, 160, y - 26, 260, y + 8);
          ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke(c.path);
        ctx.restore();
      }
    }

    if (scene.lanterns) {
      for (const l of scene.lanterns) {
        ctx.save();
        ctx.translate(cam.x * (1 - l.p), cam.y * (1 - l.p) * 0.4);
        const a = 0.3 + 0.25 * Math.sin(time * 0.8 + l.ph);
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 26);
        g.addColorStop(0, L.rgba(level.palette[4], a));
        g.addColorStop(1, L.rgba(level.palette[4], 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(l.x, l.y, 26, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,250,230,0.7)';
        ctx.beginPath(); ctx.arc(l.x, l.y, 2, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    if (scene.torii) {
      A.drawTorii(ctx, scene.torii, cam, time, colorAmt, level);
    }
    if (scene.groundTorii) {
      A.drawTorii(ctx, scene.groundTorii, cam, time, colorAmt, level);
    }
  };

  A.drawGroundTree = function (ctx, t, level, time, colorAmt) {
    const rng = L.mulberry32(t.seed * 131 + 7);
    const x = t.x, y = t.y, h = t.h;
    const palette = level.palette;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.tint('#4f4b44', palette[0], colorAmt, 0.42);
    ctx.lineWidth = Math.max(3, h * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 5, y - h * 0.35, x + 7, y - h * 0.68, x + 2, y - h);
    ctx.stroke();
    // branches
    ctx.lineWidth = Math.max(1.4, h * 0.022);
    for (let i = 0; i < 4; i++) {
      const by = y - h * (0.38 + i * 0.15);
      const dir = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x + (rng() - 0.5) * 4, by);
      ctx.quadraticCurveTo(x + dir * h * 0.12, by - h * 0.06, x + dir * h * (0.22 + rng() * 0.1), by - h * 0.15);
      ctx.stroke();
    }
    if (t.dead) {
      for (let i = 0; i < 9; i++) {
        const by = y - h * (0.3 + rng() * 0.65);
        const dir = rng() > 0.5 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + (rng() - 0.5) * 6, by);
        ctx.quadraticCurveTo(x + dir * 10, by - 6, x + dir * (14 + rng() * 16), by - 12 - rng() * 12);
        ctx.stroke();
      }
    } else if (t.blossom) {
      const n = 30;
      for (let i = 0; i < n; i++) {
        const a = rng() * TAU;
        const rr = Math.pow(rng(), 0.6) * h * 0.32;
        const px = x + Math.cos(a) * rr * 0.9;
        const py = y - h * 0.82 + Math.sin(a) * rr * 0.6;
        const col = palette[(rng() * palette.length) | 0];
        ctx.globalAlpha = 0.35 + colorAmt * 0.55;
        ctx.fillStyle = colorAmt > 0.15 ? col : '#bdb4a6';
        ctx.beginPath();
        ctx.ellipse(px, py, 2 + rng() * 3.4, 1.4 + rng() * 2.2, rng() * TAU, 0, TAU);
        ctx.fill();
      }
    } else {
      // sparse surviving leaves — the world has lost most of them
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = rng() * TAU;
        const rr = Math.pow(rng(), 0.5) * h * 0.26;
        const px = x + Math.cos(a) * rr * 0.95;
        const py = y - h * 0.82 + Math.sin(a) * rr * 0.55;
        ctx.globalAlpha = 0.3 + rng() * 0.25;
        ctx.fillStyle = colorAmt > 0.3 ? palette[(rng() * palette.length) | 0] : '#a9a192';
        ctx.beginPath();
        ctx.ellipse(px, py, 1.4 + rng() * 2.2, 0.9 + rng() * 1.4, rng() * TAU, 0, TAU);
        ctx.fill();
      }
      if (colorAmt > 0.25) {
        for (let i = 0; i < 8; i++) {
          ctx.globalAlpha = colorAmt * 0.6;
          ctx.fillStyle = palette[(rng() * palette.length) | 0];
          ctx.beginPath();
          ctx.arc(x + (rng() - 0.5) * h * 0.42, y - h * (0.62 + rng() * 0.3), 1.6 + rng() * 2, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  A.drawBigTower = function (ctx, t, cam, colorAmt, level, alpha) {
    ctx.save();
    ctx.translate(cam.x * (1 - t.p), cam.y * (1 - t.p) * 0.3);
    ctx.globalAlpha = alpha;
    const x = t.x, y = t.y, hh = t.h, ww = t.w;
    ctx.fillStyle = A.tint('#8f8b83', level.palette[1], colorAmt, 0.35);
    ctx.beginPath();
    ctx.moveTo(x - ww * 0.3, y);
    ctx.lineTo(x - ww * 0.2, y - hh * 0.86);
    ctx.lineTo(x + ww * 0.2, y - hh * 0.86);
    ctx.lineTo(x + ww * 0.3, y);
    ctx.closePath();
    ctx.fill();
    // roofs
    for (let k = 0; k < 4; k++) {
      const ry = y - hh * (0.35 + k * 0.18);
      const rw = ww * (0.62 - k * 0.08);
      ctx.beginPath();
      ctx.moveTo(x - rw, ry);
      ctx.quadraticCurveTo(x, ry - 54, x + rw, ry);
      ctx.quadraticCurveTo(x, ry + 16, x - rw, ry);
      ctx.fill();
    }
    // windows
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = '#fff6dc';
    for (let k = 0; k < 9; k++) {
      const wy = y - hh * (0.14 + k * 0.075);
      if (k % 2 === 0) ctx.fillRect(x - ww * 0.12, wy, ww * 0.24, 2.5);
    }
    ctx.restore();
  };

  A.drawTorii = function (ctx, t, cam, time, colorAmt, level) {
    ctx.save();
    ctx.translate(cam.x * (1 - t.p), 0);
    const x = t.x, y = t.y, s = t.s;
    const base = '#b9b1a4';
    const col = colorAmt > 0.02 ? L.mixHex(base, '#c14f42', Math.min(1, colorAmt * 1.15)) : base;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.62;
    ctx.fillRect(x - 90 * s, y - 190 * s, 16 * s, 190 * s);
    ctx.fillRect(x + 74 * s, y - 190 * s, 16 * s, 190 * s);
    ctx.beginPath();
    ctx.moveTo(x - 130 * s, y - 190 * s);
    ctx.quadraticCurveTo(x, y - 215 * s, x + 130 * s, y - 190 * s);
    ctx.lineTo(x + 120 * s, y - 175 * s);
    ctx.quadraticCurveTo(x, y - 198 * s, x - 120 * s, y - 175 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 100 * s, y - 150 * s, 200 * s, 10 * s);
    ctx.restore();
  };

  /* ------------------------- color blooms ------------------------- */
  A.drawBloom = function (ctx, b) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, L.rgba(b.color, 0.28 * b.alpha));
    g.addColorStop(0.45, L.rgba(b.color, 0.13 * b.alpha));
    g.addColorStop(1, L.rgba(b.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* ------------------------- solids ------------------------- */
  A.drawSolid = function (ctx, s, level, time, colorAmt) {
    const rng = L.mulberry32(s.seed);
    const pts = [];
    const step = 26;
    pts.push({ x: s.x, y: s.y });
    for (let x = s.x + step; x < s.x + s.w; x += step) {
      pts.push({ x, y: s.y + (rng() - 0.5) * 4.5 });
    }
    pts.push({ x: s.x + s.w, y: s.y });
    const poly = [...pts];
    for (let y = s.y + 26; y < s.y + s.h - 10; y += 38) {
      poly.push({ x: s.x + s.w + Math.sin(y * 0.037 + s.seed) * 2.6, y });
    }
    poly.push({ x: s.x + s.w, y: s.y + s.h });
    poly.push({ x: s.x, y: s.y + s.h });
    for (let y = s.y + s.h - 32; y > s.y + 20; y -= 38) {
      poly.push({ x: s.x + Math.sin(y * 0.041 + s.seed * 2) * 2.6, y });
    }

    // soft shadow
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#2a2825';
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + Math.min(s.h * 0.55, 80) + 14, s.w * 0.54, 22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    const path = pathFromPoly(poly);
    const g = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 300));
    g.addColorStop(0, A.tint('#393941', level.palette[0], colorAmt, 0.5));
    g.addColorStop(0.1, A.tint('#2a2a32', level.palette[1], colorAmt, 0.34));
    g.addColorStop(0.55, A.tint('#202027', level.palette[4], colorAmt, 0.28));
    g.addColorStop(1, A.tint('#17171c', level.palette[3], colorAmt, 0.22));
    ctx.fillStyle = g;
    ctx.fill(path);

    // ink-bleed blooms on the slab face
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.w, s.y);
    ctx.lineTo(s.x + s.w, s.y + s.h);
    ctx.lineTo(s.x, s.y + s.h);
    ctx.closePath();
    ctx.clip();
    const br = L.mulberry32(s.seed + 17);
    for (let i = 0; i < 4; i++) {
      const bx = s.x + br() * s.w;
      const by = s.y + 20 + br() * Math.min(160, s.h * 0.7);
      const rr = 40 + br() * 130;
      const gg = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      const light = br() > 0.5;
      gg.addColorStop(0, light ? 'rgba(255,248,232,0.045)' : 'rgba(0,0,0,0.16)');
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.ellipse(bx, by, rr, rr * 0.55, 0, 0, TAU); ctx.fill();
    }
    // wet edge just below the rim
    const rim = ctx.createLinearGradient(0, s.y, 0, s.y + 46);
    rim.addColorStop(0, 'rgba(255,247,228,0.09)');
    rim.addColorStop(1, 'rgba(255,247,228,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(s.x, s.y, s.w, 46);

    // dry fibres and tiny mineral glints in the ink face
    const tr = L.mulberry32(s.seed + 41);
    for (let i = 0; i < 26; i++) {
      const x = s.x + 12 + tr() * (s.w - 24);
      const y = s.y + 18 + tr() * Math.min(190, s.h - 24);
      const l = 8 + tr() * 34;
      ctx.globalAlpha = 0.035 + tr() * 0.04;
      ctx.strokeStyle = tr() > 0.35 ? '#fff6e0' : '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + l * 0.5, y + (tr() - 0.5) * 10, x + l, y + (tr() - 0.5) * 16);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#fff8e6';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(s.x + tr() * s.w, s.y + 12 + tr() * Math.min(200, s.h - 20), 0.6 + tr() * 1.2, 0, TAU);
      ctx.fill();
    }
    if (colorAmt > 0.2) {
      for (let i = 0; i < 34; i++) {
        ctx.globalAlpha = colorAmt * (0.2 + tr() * 0.25);
        ctx.fillStyle = level.palette[(tr() * level.palette.length) | 0];
        ctx.beginPath();
        ctx.arc(s.x + tr() * s.w, s.y + 12 + tr() * Math.min(220, s.h - 20), 0.8 + tr() * 1.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // top rim
    ctx.save();
    ctx.strokeStyle = 'rgba(255,248,230,0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    traceSmooth(ctx, pts);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) ctx.moveTo(p.x, p.y + 3);
      else ctx.lineTo(p.x, p.y + 3);
    }
    ctx.stroke();
    ctx.restore();

    // colored moss edge when the world is waking
    if (colorAmt > 0.05) {
      ctx.save();
      ctx.globalAlpha = colorAmt * 0.7;
      ctx.strokeStyle = level.palette[2];
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      traceSmooth(ctx, pts);
      ctx.stroke();
      ctx.restore();
    }

    // hatching
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#fff8e8';
    ctx.lineWidth = 1;
    const hr = L.mulberry32(s.seed + 5);
    const count = Math.min(30, Math.floor(s.w / 30));
    for (let i = 0; i < count; i++) {
      const x = s.x + 18 + hr() * (s.w - 36);
      const y = s.y + 14 + hr() * Math.min(150, s.h - 20);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10 + hr() * 26, y + 3 + hr() * 12);
      ctx.stroke();
    }
    // side edges
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x + 1, s.y + 10); ctx.lineTo(s.x + 1, s.y + s.h);
    ctx.moveTo(s.x + s.w - 1, s.y + 10); ctx.lineTo(s.x + s.w - 1, s.y + s.h);
    ctx.stroke();
    ctx.restore();

    // rough rock underside for floating shelves
    if ((s.kind === 'ledge' || s.kind === 'stone') &&
        (level.theme === 'cliff' || level.theme === 'tower' || level.theme === 'mist' || level.theme === 'bloom')) {
      const rr = L.mulberry32(s.seed + 61);
      const by = s.y + s.h;
      const depth = (s.kind === 'stone' ? 24 : 30) + rr() * 34;
      const n = Math.max(4, Math.round(s.w / 28));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.x + 2, by);
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const x = s.x + 2 + u * (s.w - 4);
        const y = by + (i === n ? 0 : depth * (0.25 + rr() * 0.75) * Math.sin(u * Math.PI) ** 0.5);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(s.x + s.w - 2, by);
      ctx.closePath();
      const ug = ctx.createLinearGradient(0, by, 0, by + depth);
      ug.addColorStop(0, '#26262e');
      ug.addColorStop(1, '#141419');
      ctx.fillStyle = ug;
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#fff5df';
      ctx.lineWidth = 1;
      ctx.stroke();
      // a few mineral drips
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 4; i++) {
        const x = s.x + 10 + rr() * (s.w - 20);
        const l = 12 + rr() * 32;
        ctx.beginPath();
        ctx.moveTo(x, by + 4);
        ctx.quadraticCurveTo(x + 2, by + l * 0.6, x, by + l);
        ctx.stroke();
      }
      ctx.restore();
    }

    // grass / flowers on top
    if (s.kind !== 'stone') {
      const gr = L.mulberry32(s.seed + 9);
      const n = Math.floor(s.w / 22);
      for (let i = 0; i < n; i++) {
        const x = s.x + 10 + gr() * (s.w - 20);
        const y = s.y + (gr() - 0.5) * 2;
        const hh = 5 + gr() * 12;
        ctx.strokeStyle = colorAmt > 0.15
          ? L.rgba(level.palette[Math.floor(gr() * level.palette.length)], 0.8 * colorAmt)
          : 'rgba(115,110,99,0.4)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 2, y - hh * 0.6, x + (gr() - 0.5) * 10, y - hh);
        ctx.stroke();
        if (colorAmt > 0.45 && gr() < 0.7) {
          const fx = x + (gr() - 0.5) * 10;
          const fy = y - hh - 3;
          const col = level.palette[Math.floor(gr() * level.palette.length)];
          const sz = 2.1 + gr() * 2.2;
          ctx.fillStyle = L.rgba(col, 0.92 * colorAmt);
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU + gr() * 0.4;
            ctx.beginPath();
            ctx.ellipse(fx + Math.cos(a) * sz, fy + Math.sin(a) * sz, sz * 0.85, sz * 0.5, a, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = `rgba(255,248,220,${0.95 * colorAmt})`;
          ctx.beginPath(); ctx.arc(fx, fy, sz * 0.55, 0, TAU); ctx.fill();
        }
      }
    }

    // hanging vines for cliff ledges
    if (level.theme === 'cliff' && s.kind === 'ledge') {
      const vr = L.mulberry32(s.seed + 21);
      for (let i = 0; i < Math.floor(s.w / 70); i++) {
        const x = s.x + 20 + vr() * (s.w - 40);
        const l = 20 + vr() * 70;
        ctx.strokeStyle = 'rgba(70,68,62,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, s.y + 30);
        ctx.bezierCurveTo(x - 6, s.y + 30 + l * 0.4, x + 8, s.y + 30 + l * 0.7, x + 2, s.y + 30 + l);
        ctx.stroke();
      }
    }

    // stone cracks
    if (s.kind === 'stone') {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#f4eee2';
      ctx.lineWidth = 1;
      const cr = L.mulberry32(s.seed + 31);
      for (let i = 0; i < 3; i++) {
        let x = s.x + 10 + cr() * (s.w - 20);
        let y = s.y + 6;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          x += (cr() - 0.5) * 14; y += 8 + cr() * 8;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  /* ------------------------- props ------------------------- */
  A.drawPickup = function (ctx, p, level, time, colorAmt) {
    if (p.taken) return;
    const palette = level.palette;
    const col = p.kind === 'seed' ? palette[3] : palette[4];
    const bob = Math.sin(time * 2 + p.bob) * 6;
    const x = p.x, y = p.y + bob;
    const pulse = 0.85 + 0.15 * Math.sin(time * 3 + p.bob);

    ctx.save();
    const halo = ctx.createRadialGradient(x, y, 2, x, y, p.kind === 'seed' ? 68 : 44);
    halo.addColorStop(0, L.rgba(col, 0.5 * pulse));
    halo.addColorStop(0.4, L.rgba(col, 0.18 * pulse));
    halo.addColorStop(1, L.rgba(col, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, p.kind === 'seed' ? 68 : 44, 0, TAU); ctx.fill();

    if (p.kind === 'seed') {
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 0.8 + p.bob) * 0.2);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i / 5) * TAU + time * 0.35);
        ctx.fillStyle = L.rgba(palette[(i + 1) % palette.length], 0.75);
        ctx.beginPath();
        ctx.ellipse(0, -15, 6, 13, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#fff8e2';
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = L.rgba(col, 0.9);
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
    } else {
      // ink drop
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      const g = ctx.createLinearGradient(-8, -8, 8, 8);
      g.addColorStop(0, L.rgba(col, 0.95));
      g.addColorStop(1, L.rgba(level.palette[(p.bob | 0) % level.palette.length], 0.9));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.bezierCurveTo(10, -4, 10, 6, 0, 12);
      ctx.bezierCurveTo(-10, 6, -10, -4, 0, -13);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,245,0.75)';
      ctx.beginPath(); ctx.ellipse(-3, -3, 2.4, 3.6, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // orbiting sparkles
    for (let i = 0; i < 3; i++) {
      const a = time * 1.4 + i * 2.1;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 2 + i);
      ctx.fillStyle = '#fff8e8';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 24, y + Math.sin(a) * 20, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  A.drawCheckpoint = function (ctx, c, level, time, colorAmt) {
    const active = c.active;
    const x = c.x, y = c.y;
    const col = level.palette[2];
    ctx.save();
    // pole
    ctx.strokeStyle = '#2c2c33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 78);
    ctx.stroke();
    // arm
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 78);
    ctx.lineTo(x + 20, y - 78);
    ctx.stroke();
    // lantern string
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x + 20, y - 78); ctx.lineTo(x + 20, y - 68); ctx.stroke();

    const lx = x + 20, ly = y - 50;
    if (active) {
      const halo = ctx.createRadialGradient(lx, ly, 2, lx, ly, 95);
      halo.addColorStop(0, L.rgba(col, 0.5));
      halo.addColorStop(0.4, L.rgba(col, 0.16));
      halo.addColorStop(1, L.rgba(col, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(lx, ly, 95, 0, TAU); ctx.fill();
    }
    // lantern body
    ctx.fillStyle = active ? L.rgba(col, 0.92) : 'rgba(120,117,108,0.35)';
    ctx.strokeStyle = active ? 'rgba(255,248,230,0.8)' : 'rgba(90,88,82,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(lx - 14, ly - 18, 28, 36, 7);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = active ? 'rgba(80,60,40,0.4)' : 'rgba(70,68,62,0.25)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(lx - 13, ly + i * 9); ctx.lineTo(lx + 13, ly + i * 9); ctx.stroke();
    }
    // tassel
    ctx.strokeStyle = active ? L.rgba(level.palette[0], 0.8) : 'rgba(90,88,82,0.3)';
    ctx.beginPath(); ctx.moveTo(lx, ly + 18); ctx.lineTo(lx, ly + 28); ctx.stroke();
    ctx.restore();
  };

  A.drawGoal = function (ctx, goal, level, time, colorAmt, near) {
    const x = goal.x, y = goal.y;
    const pulse = 0.85 + 0.15 * Math.sin(time * 1.6);
    ctx.save();
    // vertical light
    const beam = ctx.createLinearGradient(0, y - 340, 0, y - 20);
    beam.addColorStop(0, 'rgba(255,255,255,0)');
    beam.addColorStop(0.55, L.rgba(level.palette[3], 0.1 * pulse));
    beam.addColorStop(1, L.rgba(level.palette[3], 0.22 * pulse));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 55, y - 20);
    ctx.lineTo(x - 16, y - 340);
    ctx.lineTo(x + 16, y - 340);
    ctx.lineTo(x + 55, y - 20);
    ctx.closePath();
    ctx.fill();
    // halo
    const halo = ctx.createRadialGradient(x, y - 105, 5, x, y - 105, 170);
    halo.addColorStop(0, L.rgba(level.palette[4], 0.3 * pulse));
    halo.addColorStop(0.4, L.rgba(level.palette[3], 0.1));
    halo.addColorStop(1, L.rgba(level.palette[3], 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y - 105, 170, 0, TAU); ctx.fill();

    // legs
    ctx.strokeStyle = '#24242b';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - 190); ctx.lineTo(x - 42, y);
    ctx.moveTo(x, y - 190); ctx.lineTo(x + 42, y);
    ctx.moveTo(x, y - 150); ctx.lineTo(x, y - 4);
    ctx.stroke();

    // canvas
    const cw = 104, ch = 126, cy = y - 158;
    ctx.save();
    ctx.translate(x, cy);
    ctx.rotate(-0.03);
    const g = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
    g.addColorStop(0, '#fff9ea');
    g.addColorStop(1, '#efe1c8');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(80,60,30,0.18)';
    ctx.shadowBlur = 18;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.shadowBlur = 0;
    // little painting
    const p = level.palette;
    ctx.save();
    ctx.beginPath(); ctx.rect(-cw / 2 + 7, -ch / 2 + 7, cw - 14, ch - 14); ctx.clip();
    const sky = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    sky.addColorStop(0, L.rgba(p[3], 0.75));
    sky.addColorStop(0.55, L.rgba(p[1], 0.55));
    sky.addColorStop(1, L.rgba(p[0], 0.6));
    ctx.fillStyle = sky;
    ctx.fillRect(-cw / 2 + 7, -ch / 2 + 7, cw - 14, ch - 14);
    ctx.fillStyle = L.rgba(p[5], 0.85);
    ctx.beginPath(); ctx.arc(18, -30, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = L.rgba(p[4], 0.55);
    ctx.beginPath();
    ctx.moveTo(-cw / 2 + 7, ch / 2 - 30);
    ctx.quadraticCurveTo(-10, -6, 8, ch / 2 - 26);
    ctx.quadraticCurveTo(26, 4, cw / 2 - 7, ch / 2 - 34);
    ctx.lineTo(cw / 2 - 7, ch / 2 - 7);
    ctx.lineTo(-cw / 2 + 7, ch / 2 - 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = L.rgba(p[2], 0.8);
    ctx.beginPath();
    ctx.moveTo(-cw / 2 + 7, ch / 2 - 8);
    ctx.quadraticCurveTo(-8, ch / 2 - 34, 18, ch / 2 - 8);
    ctx.fill();
    ctx.restore();
    // frame
    ctx.strokeStyle = '#2b2a30';
    ctx.lineWidth = 5;
    ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();

    // floating sparks
    for (let i = 0; i < 7; i++) {
      const a = time * 0.6 + i * 1.7;
      const rx = 30 + Math.sin(i * 3.1) * 22;
      const yy = y - 100 + Math.cos(a) * 70;
      ctx.globalAlpha = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 2 + i));
      ctx.fillStyle = level.palette[i % level.palette.length];
      ctx.beginPath();
      ctx.arc(x + Math.sin(a) * rx, yy, 2 + (i % 2), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  A.drawWhisper = function (ctx, w, player, time) {
    const d = L.dist(w.x, w.y, player.x, player.y);
    const a = 0.1 + 0.6 * L.smoothstep(760, 220, d);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#4a463e';
    ctx.font = `${w.size || 19}px "STKaiti","KaiTi","Kaiti SC",serif`;
    ctx.textAlign = 'left';
    ctx.fillText(w.text, w.x, w.y + Math.sin(time * 0.8 + w.x) * 2);
    ctx.globalAlpha = a * 0.45;
    ctx.fillRect(w.x - 18, w.y - 7, 9, 1.5);
    ctx.restore();
  };

  /* ------------------------- strokes ------------------------- */
  A.drawStroke = function (ctx, s, time) {
    if (!s.points || s.points.length < 2) return;
    const raw = s.points;
    // subtle hand-drawn waver (collision remains the straight capsule)
    const pts = [];
    for (let i = 0; i < raw.length; i++) {
      const p = raw[i];
      const a = raw[Math.max(0, i - 1)], b = raw[Math.min(raw.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dl = Math.hypot(dx, dy) || 1;
      const off = Math.sin(i * 1.17 + s.seed * 0.37) * 1.15;
      pts.push({ x: p.x - dy / dl * off, y: p.y + dx / dl * off });
    }
    let a = s.life <= 0 ? 0 : L.clamp(s.life / 5, 0, 1);
    if (s.life < 1.8) a *= 0.6 + 0.4 * Math.sin(time * 24 + s.seed);
    if (a <= 0.01) return;
    const fade = L.clamp(s.life / s.maxLife, 0, 1);
    const c1 = L.desat(s.c1, (1 - a) * 0.55);
    const c2 = L.desat(s.c2, (1 - a) * 0.55);
    const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    g.addColorStop(0, c1);
    g.addColorStop(0.5, c2);
    g.addColorStop(1, c1);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.035;
    ctx.strokeStyle = s.c1;
    ctx.lineWidth = 44;
    ctx.shadowColor = s.c1;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    traceSmooth(ctx, pts);
    ctx.stroke();

    // a watercolour wash settling into the paper
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = a * 0.15;
    ctx.strokeStyle = g;
    ctx.lineWidth = 32;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    traceSmooth(ctx, pts);
    ctx.stroke();

    // dry-brush bristles
    const dx = pts[pts.length - 1].x - pts[0].x;
    const dy = pts[pts.length - 1].y - pts[0].y;
    const dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl, ny = dx / dl;
    const bristles = [
      [-5.4, 2.6, 0.26, s.c2],
      [-2.7, 3.1, 0.4, s.c1],
      [0, 10, 0.84, null],
      [2.7, 3.1, 0.4, s.c2],
      [5.4, 2.6, 0.26, s.c1]
    ];
    ctx.globalCompositeOperation = 'source-over';
    for (const b of bristles) {
      ctx.save();
      ctx.translate(nx * b[0], ny * b[0]);
      ctx.globalAlpha = a * b[2];
      ctx.strokeStyle = b[3] || g;
      ctx.lineWidth = b[1];
      ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
      ctx.restore();
    }

    // a breath of light along the top edge
    ctx.globalAlpha = a * 0.12;
    ctx.strokeStyle = L.mixHex(s.c1, '#fffdf4', 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    traceSmooth(ctx, pts);
    ctx.stroke();

    // pigment speckles
    const rng = L.mulberry32(s.seed);
    for (let i = 2; i < pts.length; i += 3) {
      if (rng() > 0.5) continue;
      const p = pts[i];
      const off = 7 + rng() * 9;
      const ang = rng() * TAU;
      ctx.globalAlpha = a * (0.28 + rng() * 0.42);
      ctx.fillStyle = rng() > 0.5 ? s.c2 : '#fff8ea';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(ang) * off, p.y + Math.sin(ang) * off, 0.8 + rng() * 1.7, 0, TAU);
      ctx.fill();
    }

    // ends
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = s.c1;
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = s.c2;
    ctx.beginPath(); ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 4.4, 0, TAU); ctx.fill();

    if (s.life < 4) {
      ctx.globalAlpha = a * 0.45;
      for (let i = 0; i < 5; i++) {
        const p = pts[Math.floor(rng() * pts.length)];
        ctx.fillStyle = '#fff6df';
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(time * 2 + i) * 8, p.y - ((time * 18 + i * 12) % 32), 1.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ------------------------- painter ------------------------- */
  A.drawPlayer = function (ctx, p, t, palette, brushTarget, drawing) {
    const x = p.x, y = p.y;
    const face = p.facing >= 0 ? 1 : -1;
    const speed = Math.abs(p.vx);
    const moving = p.onGround && speed > 24;
    const run = moving ? Math.sin(p.runPhase) : 0;
    const bob = moving ? Math.abs(Math.sin(p.runPhase)) * 1.6 : Math.sin(t * 2) * 0.8;
    const hue = palette[0];
    const dead = p.dead;

    ctx.save();
    if (dead) ctx.globalAlpha = 0.35;

    // shadow
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = '#1d1c1a';
    ctx.beginPath();
    ctx.ellipse(x, y + 19, 20, 6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // aura
    const aura = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 64);
    aura.addColorStop(0, L.rgba(hue, 0.16));
    aura.addColorStop(0.5, L.rgba(hue, 0.05));
    aura.addColorStop(1, L.rgba(hue, 0));
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(x, y - 8, 64, 0, TAU); ctx.fill();

    // scarf (behind)
    if (p.scarf && p.scarf.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < p.scarf.length - 1; i++) {
        const q = p.scarf[i], n = p.scarf[i + 1];
        const w = 4.2 * (1 - i / p.scarf.length) + 1;
        ctx.strokeStyle = palette[(i + 2) % palette.length];
        ctx.globalAlpha = 0.9 - i * 0.1;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y - bob);

    // legs
    const hipY = 6;
    const legSwing = moving ? run * 5 : 0;
    ctx.strokeStyle = '#2a2930';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (p.onGround) {
      ctx.beginPath();
      ctx.moveTo(-4, hipY);
      ctx.lineTo(-5 + legSwing, hipY + 11);
      ctx.moveTo(4, hipY);
      ctx.lineTo(5 - legSwing, hipY + 11);
      ctx.stroke();
      // feet
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-5 + legSwing, hipY + 11);
      ctx.lineTo(-8 + legSwing * 1.3, hipY + 11);
      ctx.moveTo(5 - legSwing, hipY + 11);
      ctx.lineTo(8 - legSwing * 1.3, hipY + 11);
      ctx.stroke();
    } else {
      const tuck = p.vy < 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(-4, hipY);
      ctx.lineTo(-8, hipY + 8 - tuck);
      ctx.moveTo(4, hipY);
      ctx.lineTo(8, hipY + 7 - tuck);
      ctx.stroke();
    }

    // cloak
    const capeSway = L.clamp(-p.vx * 0.012, -5, 5);
    const bodyG = ctx.createLinearGradient(0, -18, 0, 16);
    bodyG.addColorStop(0, '#34333c');
    bodyG.addColorStop(1, '#1f1e25');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.quadraticCurveTo(-14, -2, -10 + capeSway * 0.4, 14);
    ctx.quadraticCurveTo(-2, 18, 4, 14);
    ctx.quadraticCurveTo(12, 4, 9, -14);
    ctx.quadraticCurveTo(0, -19, -8, -15);
    ctx.closePath();
    ctx.fill();
    // cloak rim
    ctx.strokeStyle = L.rgba(hue, 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, -13);
    ctx.quadraticCurveTo(-14, 0, -10 + capeSway * 0.4, 13);
    ctx.stroke();

    // belt
    ctx.strokeStyle = L.rgba(palette[3], 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(9, 0);
    ctx.stroke();

    // arm + brush (all local coordinates)
    const shx = 6, shy = -11;
    const tgt = brushTarget ? { x: brushTarget.x - x, y: brushTarget.y - (y - bob) } : null;
    let hx, hy;
    if (drawing && tgt) {
      const dx = tgt.x - shx, dy = tgt.y - shy;
      const d = Math.max(1, Math.hypot(dx, dy));
      hx = shx + dx / d * 15;
      hy = shy + dy / d * 15;
    } else {
      hx = 11 * face;
      hy = 2;
    }
    ctx.strokeStyle = '#2d2c33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shx, shy);
    ctx.quadraticCurveTo(shx + 6 * face, -2, hx, hy);
    ctx.stroke();

    // brush
    let bx = hx, by = hy;
    let ang = drawing && tgt
      ? Math.atan2(tgt.y - hy, tgt.x - hx)
      : (face > 0 ? -0.55 : Math.PI + 0.55);
    const bl = 26;
    const tx = bx + Math.cos(ang) * bl;
    const ty = by + Math.sin(ang) * bl;
    ctx.strokeStyle = '#4a3a2c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#b9b0a0';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(ang) * 5, ty + Math.sin(ang) * 5);
    ctx.stroke();
    // bristles glow
    const tipX = tx + Math.cos(ang) * 9;
    const tipY = ty + Math.sin(ang) * 9;
    const tip = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, drawing ? 20 : 12);
    tip.addColorStop(0, L.rgba(palette[4], 0.9));
    tip.addColorStop(0.35, L.rgba(palette[0], 0.5));
    tip.addColorStop(1, L.rgba(palette[0], 0));
    ctx.fillStyle = tip;
    ctx.beginPath(); ctx.arc(tipX, tipY, drawing ? 20 : 12, 0, TAU); ctx.fill();
    ctx.fillStyle = palette[4];
    ctx.beginPath(); ctx.arc(tipX, tipY, 2.6, 0, TAU); ctx.fill();

    // head
    const headY = -26;
    ctx.fillStyle = '#f2e5d1';
    ctx.beginPath(); ctx.arc(0, headY, 9.6, 0, TAU); ctx.fill();
    // hair
    ctx.fillStyle = '#2b2a31';
    ctx.beginPath();
    ctx.arc(0, headY - 1.5, 9.7, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(-4, headY - 8, -9, headY - 2);
    ctx.fill();
    // beret
    ctx.save();
    ctx.translate(-1, headY - 8);
    ctx.rotate(-0.16);
    ctx.fillStyle = '#3a3942';
    ctx.beginPath(); ctx.ellipse(0, 0, 11.5, 4.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = palette[5] || palette[0];
    ctx.beginPath(); ctx.arc(1, -4, 2.4, 0, TAU); ctx.fill();
    ctx.restore();

    // face
    const blink = p.blink > 0;
    ctx.fillStyle = '#2a2830';
    if (blink) {
      ctx.strokeStyle = '#2a2830';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(face * 1.5, headY + 1);
      ctx.lineTo(face * 5.5, headY + 1);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(face * 3.6, headY + 0.5, 1.15, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(face * 0.2, headY + 0.8, 1.05, 0, TAU); ctx.fill();
    }
    // cheek
    ctx.fillStyle = L.rgba(palette[0], 0.35);
    ctx.beginPath(); ctx.arc(face * 5.6, headY + 4.5, 1.9, 0, TAU); ctx.fill();

    // drawing thread to the actual pointer
    if (drawing && tgt) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = palette[4];
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  };

  /* ------------------------- particles ------------------------- */
  A.drawParticle = function (ctx, q) {
    const a = L.clamp(q.life / q.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a * (q.alpha == null ? 1 : q.alpha);
    if (q.type === 'ring') {
      ctx.strokeStyle = q.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, TAU);
      ctx.stroke();
    } else if (q.type === 'petal') {
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot + (1 - a) * 3);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, q.size, q.size * 0.46, 0, 0, TAU);
      ctx.fill();
    } else if (q.type === 'spark') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = q.color;
      ctx.lineWidth = q.size * 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03);
      ctx.stroke();
    } else if (q.type === 'text') {
      ctx.fillStyle = q.color;
      ctx.font = `600 ${q.size}px "Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(q.text, q.x, q.y);
    } else if (q.type === 'bloom') {
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
      g.addColorStop(0, L.rgba(q.color, 0.35 * a));
      g.addColorStop(1, L.rgba(q.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ------------------------- title scene ------------------------- */
  A.buildTitle = function () {
    const rng = L.mulberry32(9001);
    return {
      petals: Array.from({ length: 34 }, () => ({
        x: rng(), y: rng(), r: 1 + rng() * 2.4, ph: rng() * 10, sp: 0.2 + rng() * 0.5
      }))
    };
  };

  A.drawTitleScene = function (ctx, w, h, time, level) {
    A.drawPaper(ctx, w, h, level, time, 0);
    const title = A._title || (A._title = A.buildTitle());
    const palette = level.palette;
    const moonX = w * 0.78, moonY = h * 0.28, moonR = Math.min(w, h) * 0.1;
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.2, moonX, moonY, moonR * 3.2);
    halo.addColorStop(0, 'rgba(255,239,200,0.45)');
    halo.addColorStop(0.45, 'rgba(255,239,200,0.12)');
    halo.addColorStop(1, 'rgba(255,239,200,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff4d9';
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, TAU); ctx.fill();

    // soft distant hills (screen space)
    for (let layer = 0; layer < 3; layer++) {
      const baseY = h * (0.78 + layer * 0.075);
      const amp = 22 + layer * 16;
      ctx.save();
      ctx.fillStyle = ['#eee6d7', '#e4dbcb', '#d6ccbc'][layer];
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(-40, h + 40);
      ctx.lineTo(-40, baseY + 40);
      for (let x = -40; x <= w + 60; x += 70) {
        const y = baseY + Math.sin(x * 0.006 + layer * 1.7 + time * 0.05) * amp * 0.45
          + Math.sin(x * 0.017 + layer) * amp * 0.2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 60, h + 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // giant ribbon
    const pts = [];
    for (let i = 0; i <= 36; i++) {
      const u = i / 36;
      const x = w * 0.49 + u * w * 0.46;
      const y = h * 0.86 - u * h * 0.62 + Math.sin(u * 5.2 - time * 0.35) * 42 * Math.sin(u * Math.PI);
      pts.push({ x, y });
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = palette[2];
    ctx.lineWidth = 55;
    ctx.shadowColor = palette[2];
    ctx.shadowBlur = 45;
    ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[36].x, pts[36].y);
    palette.forEach((c, i) => g.addColorStop(i / (palette.length - 1), c));
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = g;
    ctx.lineWidth = 44;
    ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
    ctx.globalAlpha = 0.96;
    ctx.lineWidth = 26;
    ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(255,255,245,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
    ctx.restore();

    // paint splash dots
    const rng = L.mulberry32(313);
    for (let i = 0; i < 26; i++) {
      const u = rng();
      const x = w * 0.49 + u * w * 0.47 + (rng() - 0.5) * 80;
      const y = h * 0.86 - u * h * 0.62 + (rng() - 0.5) * 80;
      ctx.globalAlpha = 0.4 + rng() * 0.4;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + rng() * 4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // painter on the near hill
    const px = w * 0.72, py = h * 0.775;
    ctx.save();
    ctx.fillStyle = 'rgba(42,41,48,0.82)';
    ctx.beginPath(); ctx.ellipse(px, py + 27, 56, 14, 0, 0, TAU); ctx.fill();
    const fake = {
      x: px, y: py, vx: 0, vy: 0, onGround: true, facing: 1, runPhase: 0,
      dead: false, blink: 0,
      scarf: Array.from({ length: 7 }, (_, i) => ({ x: px - 8 - i * 7, y: py - 34 + Math.sin(time + i) * 3 }))
    };
    const ps = 1.6;
    ctx.translate(px, py + 16);
    ctx.scale(ps, ps);
    ctx.translate(-px, -(py + 16));
    A.drawPlayer(ctx, fake, time, palette, null, false);
    ctx.restore();

    // floating petals
    for (const p of title.petals) {
      const x = ((p.x * w + time * 14 * p.sp + 20) % (w + 80)) - 40;
      const y = ((p.y * h + time * 9 * p.sp) % (h + 80)) - 40;
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 0.8 + p.ph) * 8);
      ctx.rotate(time * 0.5 * p.sp + p.ph);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = palette[(p.ph * 3) % palette.length | 0];
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.7, p.r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // foreground wash
    const fg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fg.addColorStop(0, 'rgba(240,232,218,0)');
    fg.addColorStop(1, 'rgba(240,232,218,0.55)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
  };

  /* ------------------------- vignette ------------------------- */
  /* ------------------------- weather ------------------------- */
  A.drawMist = function (ctx, zone, wisps, time, colorAmt, front) {
    if (!wisps) return;
    ctx.save();
    for (const w of wisps) {
      const span = zone.w + 520;
      let x = zone.x - 200 + ((w.x - zone.x + 200 + time * 13 * w.sp) % span);
      const y = w.y + Math.sin(time * 0.22 + w.ph) * 26;
      let clear = 0;
      if (zone.clearings) {
        for (const c of zone.clearings) {
          const d = L.dist(x, y, c.x, c.y);
          clear = Math.max(clear, 1 - d / c.r);
        }
      }
      const a = w.a * (front ? 0.72 : 1.25) * (1 - clear * 0.96);
      if (a <= 0.015) continue;
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(x, y, 0, x, y, w.rx);
      g.addColorStop(0, '#fbfcf7');
      g.addColorStop(0.55, 'rgba(246,248,242,0.75)');
      g.addColorStop(1, 'rgba(246,248,242,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, w.rx, w.ry, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  A.drawWind = function (ctx, zone, streaks, time) {
    if (!streaks) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(zone.x, zone.y, zone.w, zone.h);
    ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < 42; i++) {
      const s = streaks[i % streaks.length];
      const span = zone.w + 360;
      const x = zone.x - 180 + ((s.x + time * 130 * s.sp * (zone.dir || 1)) % span + span) % span;
      const y = s.y + Math.sin(time * 0.7 + s.ph) * 12;
      const dir = zone.dir || 1;
      const g = ctx.createLinearGradient(x, y, x + s.len * dir, y);
      g.addColorStop(0, 'rgba(90,90,84,0)');
      g.addColorStop(0.32, `rgba(86,86,80,${Math.min(0.42, s.a * 2.8)})`);
      g.addColorStop(1, 'rgba(86,86,80,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s.len * 0.5 * dir, y - 6, x + s.len * dir, y);
      ctx.stroke();
    }
    // a few long gusts
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
      const y = zone.y + ((i + 0.5) / 5) * zone.h + Math.sin(time * 0.4 + i) * 30;
      ctx.strokeStyle = '#6f6c64';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(zone.x - 60, y);
      ctx.bezierCurveTo(zone.x + zone.w * 0.3, y - 30, zone.x + zone.w * 0.6, y + 40, zone.x + zone.w + 60, y);
      ctx.stroke();
    }
    // a few dust motes
    for (let i = 0; i < 18; i++) {
      const span = zone.w + 200;
      const x = zone.x - 100 + ((i * 173 + time * 160) % span);
      const y = zone.y + ((i * 97 + Math.sin(time + i) * 60) % zone.h);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#6f6c64';
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  A.drawPreview = function (ctx, st, time, palette) {
    if (!st || st.points.length < 1) return;
    const pts = st.points;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (pts.length > 1) {
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = palette[4];
      ctx.lineWidth = 16;
      ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 5;
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -time * 40;
      ctx.beginPath(); traceSmooth(ctx, pts); ctx.stroke();
      ctx.setLineDash([]);
    }
    const tip = pts[pts.length - 1];
    const halo = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 26);
    halo.addColorStop(0, 'rgba(255,255,245,0.9)');
    halo.addColorStop(0.35, L.rgba(palette[4], 0.5));
    halo.addColorStop(1, L.rgba(palette[4], 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fffdf2';
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 3.2, 0, TAU); ctx.fill();
    ctx.restore();
  };

  A.drawVignette = function (ctx, w, h) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(60,48,32,0)');
    g.addColorStop(0.72, 'rgba(60,48,32,0.05)');
    g.addColorStop(1, 'rgba(60,48,32,0.19)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // top mist
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.16);
    top.addColorStop(0, 'rgba(255,250,238,0.32)');
    top.addColorStop(1, 'rgba(255,250,238,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.16);
  };
})();

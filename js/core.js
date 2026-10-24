/* =========================================================
   光影绘梦师 — core helpers & input
   ========================================================= */
(function () {
  const L = window.Lumen = window.Lumen || {};

  L.TAU = Math.PI * 2;
  L.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  L.lerp = (a, b, t) => a + (b - a) * t;
  L.invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  L.smoothstep = (a, b, v) => {
    const t = L.clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  L.easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  L.easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  L.approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
  L.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  L.dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);

  L.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  L.hash2 = function (x, y) {
    let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  };
  L.pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  L.hsl = (h, s, l, a) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a == null ? 1 : a})`;
  L.hexToRgb = function (hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  L.rgba = function (hex, a) {
    const c = L.hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  };
  L.mixHex = function (a, b, t) {
    const A = L.hexToRgb(a), B = L.hexToRgb(b);
    const r = Math.round(L.lerp(A.r, B.r, t));
    const g = Math.round(L.lerp(A.g, B.g, t));
    const bl = Math.round(L.lerp(A.b, B.b, t));
    return `rgb(${r},${g},${bl})`;
  };
  L.desat = function (hex, t) {
    const c = L.hexToRgb(hex);
    const l = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114);
    return `rgb(${Math.round(L.lerp(c.r, l, t))},${Math.round(L.lerp(c.g, l, t))},${Math.round(L.lerp(c.b, l, t))})`;
  };
  L.formatTime = function (sec) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  L.shuffle = function (rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  L.pointInRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  L.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  /* ------------------------- input ------------------------- */
  L.Input = class Input {
    constructor(canvas) {
      this.canvas = canvas;
      this.keys = new Set();
      this.pressed = new Set();
      this.released = new Set();
      this.mouse = {
        x: 0, y: 0, downX: 0, downY: 0,
        down: false, pressed: false, released: false,
        inside: false, type: 'mouse', moved: false
      };
      this._bind();
    }

    _bind() {
      const gameKeys = new Set([
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Escape', 'KeyR', 'KeyM', 'Enter'
      ]);
      window.addEventListener('keydown', (e) => {
        if (gameKeys.has(e.code)) e.preventDefault();
        if (e.repeat) return;
        this.keys.add(e.code);
        this.pressed.add(e.code);
      }, { passive: false });
      window.addEventListener('keyup', (e) => {
        if (!this.keys.has(e.code)) return;
        this.keys.delete(e.code);
        this.released.add(e.code);
      });
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.mouse.down = false;
      });

      const c = this.canvas;
      const pos = (e) => {
        const r = c.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      c.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const p = pos(e);
        this.mouse.x = p.x; this.mouse.y = p.y;
        this.mouse.downX = p.x; this.mouse.downY = p.y;
        this.mouse.down = true;
        this.mouse.pressed = true;
        this.mouse.inside = true;
        this.mouse.type = e.pointerType || 'mouse';
        this.mouse.moved = false;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      c.addEventListener('pointermove', (e) => {
        const p = pos(e);
        this.mouse.x = p.x; this.mouse.y = p.y;
        this.mouse.inside = true;
        this.mouse.moved = true;
        if (this.mouse.down) e.preventDefault();
      });
      const up = (e) => {
        if (!this.mouse.down) return;
        this.mouse.down = false;
        this.mouse.released = true;
        try { c.releasePointerCapture(e.pointerId); } catch (err) {}
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('pointerleave', () => { this.mouse.inside = false; });
      c.addEventListener('pointerenter', () => { this.mouse.inside = true; });
      c.addEventListener('contextmenu', e => e.preventDefault());

      document.querySelectorAll('[data-key]').forEach(btn => {
        const code = btn.getAttribute('data-key');
        const press = (e) => {
          e.preventDefault();
          if (!this.keys.has(code)) { this.keys.add(code); this.pressed.add(code); }
          btn.classList.add('active');
        };
        const release = (e) => {
          e.preventDefault();
          this.keys.delete(code);
          this.released.add(code);
          btn.classList.remove('active');
        };
        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('pointerleave', (e) => { if (e.buttons) release(e); });
      });
    }

    down(...codes) { return codes.some(c => this.keys.has(c)); }
    justPressed(...codes) { return codes.some(c => this.pressed.has(c)); }
    justReleased(...codes) { return codes.some(c => this.released.has(c)); }
    get left() { return this.down('ArrowLeft', 'KeyA'); }
    get right() { return this.down('ArrowRight', 'KeyD'); }
    get jump() { return this.down('Space', 'ArrowUp', 'KeyW'); }

    endFrame() {
      this.pressed.clear();
      this.released.clear();
      this.mouse.pressed = false;
      this.mouse.released = false;
      this.mouse.moved = false;
    }
  };
})();

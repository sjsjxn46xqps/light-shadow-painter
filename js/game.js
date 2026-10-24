/* =========================================================
   光影绘梦师 — game loop, physics, drawing, flow
   ========================================================= */
(function () {
  const L = window.Lumen;
  const A = L.Art;
  const TAU = Math.PI * 2;
  const VIEW_H = 720;
  const PLAYER_R = 15;
  const MAX_STROKE = 380;
  const INK_COST = 0.13;
  const MAX_STROKES = 10;
  const STEP = 1 / 120;
  const PROGRESS_KEY = 'lumen-progress-v1';

  const COMPLETE_LINES = {
    field: '第一笔落下，风里有了一点暖意。',
    cliff: '回声安静下来，崖壁上开出了花。',
    mist: '雾散开的一瞬，你想起了某种蓝。',
    tower: '风绕过你画的墙，塔顶亮起了星。',
    bloom: '世界，想起了颜色。'
  };

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.input = new L.Input(canvas);
      this.audio = new L.AudioEngine();
      this.ui = this.cacheUI();
      this.progress = this.loadProgress();
      this.state = 'title';
      this.t = 0;
      this.last = 0;
      this.acc = 0;
      this.level = null;
      this.levelIndex = 0;
      this.scene = null;
      this.player = null;
      this.strokes = [];
      this.particles = [];
      this.blooms = [];
      this.currentStroke = null;
      this.strokeSerial = 0;
      this.ink = 100;
      this.colorAmt = 0;
      this.colorScore = 0;
      this.completeT = 0;
      this.completionOpened = false;
      this.introT = 0;
      this.cam = { x: 0, y: 0 };
      this.shake = 0;
      this.respawn = { x: 0, y: 0 };
      this.stats = { time: 0, strokes: 0, deaths: 0 };
      this.hintTimer = 0;
      this.toastTimer = 0;
      this.inMist = false;
      this.inWind = false;
      this.windMul = 1;
      this.titleLevel = { bg: ['#f7efe1', '#e6dccb'], palette: L.PALETTES.bloom, theme: 'bloom' };
      this.params = new URLSearchParams(location.search);
      this.autoPause = this.params.get('debug') !== '1';
      this.token = 0;
      this.hintsSeen = {};
      this.endingT = 0;

      this.resize();
      this.bindUI();
      this.bindGlobal();
      this.showTitle();
      this.loop = this.loop.bind(this);
      this.last = performance.now();
      requestAnimationFrame(this.loop);

      const auto = this.params.get('level');
      if (auto !== null) {
        const li = L.clamp(parseInt(auto, 10) || 0, 0, L.LEVELS.length - 1);
        setTimeout(() => this.startLevel(li), 700);
      }

      window.__lumen = {
        game: this,
        start: i => this.startLevel(i),
        teleport: (x, y) => { if (this.player) { this.player.x = x; this.player.y = y; this.player.vx = 0; this.player.vy = 0; this.updateCamera(1, true); } },
        info: () => ({
          state: this.state, level: this.levelIndex,
          p: this.player ? { x: this.player.x, y: this.player.y, vx: this.player.vx, vy: this.player.vy, onGround: this.player.onGround, dead: this.player.dead } : null,
          ink: this.ink, strokes: this.strokes.length,
          cam: { x: this.cam.x, y: this.cam.y }, color: this.colorAmt
        }),
        complete: () => this.completeLevel(),
        setInk: n => { this.ink = n; },
        postcard: () => this.makePostcard(true)
      };
    }

    cacheUI() {
      const q = id => document.getElementById(id);
      return {
        titleScreen: q('titleScreen'), btnStart: q('btnStart'), btnChapters: q('btnChapters'),
        chapterRow: q('chapterRow'), btnNew: q('btnNew'), titleStats: q('titleStats'), titleDots: q('titleDots'),
        hud: q('hud'), hudNo: q('hudNo'), hudName: q('hudName'), hudSub: q('hudSub'),
        inkFill: q('inkFill'), inkValue: q('inkValue'), inkMeter: q('inkMeter'),
        colorFill: q('colorFill'), colorValue: q('colorValue'),
        hint: q('hint'), hintText: q('hintText'), hintSub: q('hintSub'),
        pauseScreen: q('pauseScreen'), btnResume: q('btnResume'), btnRestart: q('btnRestart'), btnQuit: q('btnQuit'),
        completeScreen: q('completeScreen'), completeTitle: q('completeTitle'), completeLine: q('completeLine'),
        statTime: q('statTime'), statStrokes: q('statStrokes'), statColor: q('statColor'),
        btnNext: q('btnNext'), btnReplay: q('btnReplay'),
        endingScreen: q('endingScreen'), endingStats: q('endingStats'), btnPostcard: q('btnPostcard'),
        btnAgain: q('btnAgain'), btnEndingTitle: q('btnEndingTitle'), endingDots: q('endingDots'),
        chapterFlash: q('chapterFlash'), cfNo: q('cfNo'), cfName: q('cfName'), cfSub: q('cfSub'),
        transition: q('transition'), toast: q('toast'), soundToggle: q('soundToggle'),
        btnPause: q('btnPause'), touch: q('touchControls')
      };
    }

    bindUI() {
      const u = this.ui;
      const click = (el, fn) => {
        if (!el) return;
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.currentTarget.blur();
          this.audio.init();
          this.audio.ui();
          fn(e);
        });
      };
      click(u.btnStart, () => this.continueFromTitle());
      click(u.btnChapters, () => u.chapterRow.classList.toggle('open'));
      click(u.btnNew, () => this.newGame());
      click(u.btnResume, () => this.resumeGame());
      click(u.btnRestart, () => this.startLevel(this.levelIndex));
      click(u.btnQuit, () => this.showTitle());
      click(u.btnNext, () => {
        if (this.levelIndex >= L.LEVELS.length - 1) this.openEnding();
        else this.startLevel(this.levelIndex + 1);
      });
      click(u.btnReplay, () => this.startLevel(this.levelIndex));
      click(u.btnPostcard, () => this.makePostcard());
      click(u.btnAgain, () => {
        this.startLevel(0);
      });
      click(u.btnEndingTitle, () => this.showTitle());
      click(u.soundToggle, () => this.toggleMute());
      click(u.btnPause, () => this.pauseGame());
      u.soundToggle.classList.toggle('muted', this.audio.muted);
      u.soundToggle.setAttribute('aria-pressed', String(this.audio.muted));
    }

    bindGlobal() {
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('blur', () => {
        if (this.autoPause && (this.state === 'playing' || this.state === 'intro')) this.pauseGame();
      });
      document.addEventListener('visibilitychange', () => {
        if (this.autoPause && document.hidden && (this.state === 'playing' || this.state === 'intro')) this.pauseGame();
      });
      window.addEventListener('pointerdown', () => this.audio.init(), { once: true });
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' && this.state === 'title') { this.audio.init(); this.continueFromTitle(); }
      });
    }

    loadProgress() {
      const p = L.store.get(PROGRESS_KEY, null);
      const def = { completed: [], next: 0, best: {}, totalTime: 0, totalStrokes: 0, runs: 0 };
      if (!p) return def;
      return Object.assign(def, p, {
        completed: Array.isArray(p.completed) ? p.completed : [],
        best: p.best || {}
      });
    }

    saveProgress() {
      L.store.set(PROGRESS_KEY, this.progress);
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.cssW = w; this.cssH = h;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.scale = h / VIEW_H;
      this.view = { w: w / this.scale, h: VIEW_H };
      if (this.level) this.updateCamera(1, true);
    }

    /* ------------------------- flow ------------------------- */
    showTitle() {
      this.token++;
      this.state = 'title';
      this.level = null;
      this.scene = null;
      this.player = null;
      this.strokes = [];
      this.particles = [];
      this.currentStroke = null;
      this.audio.brush(false);
      this.ui.titleScreen.classList.add('show');
      this.ui.hud.classList.remove('on');
      this.ui.pauseScreen.classList.remove('show');
      this.ui.completeScreen.classList.remove('show');
      this.ui.endingScreen.classList.remove('show');
      this.ui.hint.classList.remove('show');
      this.ui.chapterFlash.classList.remove('show');
      this.ui.chapterRow.classList.remove('open');
      this.refreshTitle();
    }

    refreshTitle() {
      const done = this.progress.completed.length;
      const u = this.ui;
      u.btnStart.textContent = done === 0 ? '开始绘梦' : (done >= L.LEVELS.length ? '再绘一次' : '继续绘梦');
      if (done > 0) {
        const mins = Math.max(1, Math.round(this.progress.totalTime / 60));
        u.titleStats.textContent = `已寻回 ${done} / ${L.LEVELS.length} 种颜色 · ${mins} 分钟`;
      } else {
        u.titleStats.textContent = '一个关于颜色、风与画笔的微小旅程';
      }
      u.btnNew.classList.toggle('show', done > 0);
      u.chapterRow.innerHTML = '';
      L.LEVELS.forEach((lv, i) => {
        const b = document.createElement('button');
        b.className = 'chapter-chip';
        const unlocked = i === 0 || this.progress.completed.includes(L.LEVELS[i - 1].id);
        if (!unlocked) b.classList.add('locked');
        if (this.progress.completed.includes(lv.id)) b.classList.add('done');
        b.innerHTML = `<span class="chip-no">${lv.no}</span><span class="chip-name">${lv.name}</span>`;
        b.addEventListener('click', () => {
          if (!unlocked) return;
          this.audio.init(); this.audio.ui();
          this.startLevel(i);
        });
        u.chapterRow.appendChild(b);
      });
      u.titleDots.innerHTML = L.LEVELS.map((lv, i) =>
        `<i class="${this.progress.completed.includes(lv.id) ? 'on' : ''}" style="--c:${lv.palette[2]}"></i>`
      ).join('');
      const next = Math.min(this.progress.next, L.LEVELS.length - 1);
      u.btnStart.dataset.next = String(done >= L.LEVELS.length ? 0 : next);
    }

    continueFromTitle() {
      const done = this.progress.completed.length;
      let idx = done >= L.LEVELS.length ? 0 : Math.min(this.progress.next, L.LEVELS.length - 1);
      this.startLevel(idx);
    }

    newGame() {
      if (!this.ui.btnNew.classList.contains('confirm')) {
        this.ui.btnNew.classList.add('confirm');
        this.ui.btnNew.textContent = '确定重来？';
        clearTimeout(this._newTimer);
        this._newTimer = setTimeout(() => {
          this.ui.btnNew.classList.remove('confirm');
          this.ui.btnNew.textContent = '从头开始';
        }, 2600);
        return;
      }
      this.progress = { completed: [], next: 0, best: {}, totalTime: 0, totalStrokes: 0, runs: 0 };
      this.saveProgress();
      this.ui.btnNew.classList.remove('confirm');
      this.ui.btnNew.textContent = '从头开始';
      this.startLevel(0);
    }

    startLevel(i) {
      i = L.clamp(i | 0, 0, L.LEVELS.length - 1);
      this.audio.init();
      const token = ++this.token;
      this.state = 'loading';
      this.ui.titleScreen.classList.remove('show');
      this.ui.pauseScreen.classList.remove('show');
      this.ui.completeScreen.classList.remove('show');
      this.ui.endingScreen.classList.remove('show');
      this.ui.transition.classList.add('on');
      setTimeout(() => {
        if (token !== this.token) return;
        this.loadLevel(i);
        this.ui.transition.classList.remove('on');
        this.ui.hud.classList.add('on');
        this.state = 'intro';
        this.introT = 0;
        this.showChapterCard();
        this.showHint(this.level.hint, this.level.subhint, 9.5);
        this.updateHUD();
      }, 380);
    }

    loadLevel(i) {
      const lv = L.LEVELS[i];
      this.levelIndex = i;
      this.level = lv;
      lv.pickups.forEach(p => { p.taken = false; });
      lv.checkpoints.forEach(c => { c.active = false; });
      lv.mists.forEach(m => { m.clearings = []; m.cleared = 0; });
      lv._whisperHeard = false;
      this.scene = A.build(lv);
      this.strokes = [];
      this.particles = [];
      this.blooms = [];
      this.currentStroke = null;
      this.strokeSerial = 0;
      this.ink = lv.startInk;
      this.colorAmt = 0;
      this.colorScore = 0;
      this.completeT = 0;
      this.completionOpened = false;
      this.shake = 0;
      this.hintTimer = 0;
      this.inMist = false;
      this.inWind = false;
      this.windMul = 1;
      this.hintsSeen = {};
      this.stats = { time: 0, strokes: 0, deaths: 0 };
      this.endingT = 0;
      this.respawn = { x: lv.spawn.x, y: lv.spawn.y };
      this.player = {
        x: lv.spawn.x, y: lv.spawn.y, vx: 0, vy: 0, r: PLAYER_R,
        onGround: false, coyote: 0, jumpBuffer: 0, facing: 1,
        runPhase: 0, blink: 2.5, dead: false, deadT: 0, invuln: 0,
        scarf: [], hue: lv.palette[0]
      };
      this.player.scarf = Array.from({ length: 7 }, (_, k) => ({
        x: lv.spawn.x - 8 - k * 6, y: lv.spawn.y - 32 + k
      }));
      this.cam.x = 0; this.cam.y = 0;
      this.updateCamera(1, true);
      this.ui.hudNo.textContent = `第${lv.no}章`;
      this.ui.hudName.textContent = lv.name;
      this.ui.hudSub.textContent = lv.en;
      this.acc = 0;
      this.updateHUD();
    }

    showChapterCard() {
      const u = this.ui;
      u.cfNo.textContent = this.level.no;
      u.cfName.textContent = this.level.name;
      u.cfSub.textContent = this.level.subtitle;
      u.chapterFlash.classList.remove('show');
      void u.chapterFlash.offsetWidth;
      u.chapterFlash.classList.add('show');
      clearTimeout(this._chapterTimer);
      this._chapterTimer = setTimeout(() => u.chapterFlash.classList.remove('show'), 3000);
    }

    pauseGame() {
      if (this.state !== 'playing' && this.state !== 'intro') return;
      this.resumeState = this.state;
      this.state = 'paused';
      this.cancelStroke();
      this.audio.brush(false);
      this.ui.pauseScreen.classList.add('show');
    }

    resumeGame() {
      if (this.state !== 'paused') return;
      this.ui.pauseScreen.classList.remove('show');
      this.state = this.resumeState || 'playing';
      if (this.state === 'intro' && this.introT > 1.2) this.state = 'playing';
      this.audio.init();
    }

    toggleMute() {
      this.audio.init();
      this.audio.toggleMute();
      this.ui.soundToggle.classList.toggle('muted', this.audio.muted);
      this.ui.soundToggle.setAttribute('aria-pressed', String(this.audio.muted));
    }

    /* ------------------------- hints / hud ------------------------- */
    showHint(text, sub, seconds) {
      const u = this.ui;
      if (!text) return;
      u.hintText.textContent = text;
      u.hintSub.textContent = sub || '';
      u.hintSub.style.display = sub ? '' : 'none';
      u.hint.classList.add('show');
      this.hintTimer = seconds || 6;
    }

    hideHint() {
      this.ui.hint.classList.remove('show');
      this.hintTimer = 0;
    }

    toast(text) {
      const u = this.ui;
      u.toast.textContent = text;
      u.toast.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => u.toast.classList.remove('show'), 2200);
    }

    updateHUD() {
      if (!this.level) return;
      const u = this.ui;
      const infinite = !!this.level.infiniteInk;
      const shown = this.currentStroke ? Math.max(0, this.ink - this.currentStroke.cost) : this.ink;
      const pct = infinite ? 1 : L.clamp(shown / 100, 0, 1);
      u.inkFill.style.width = (pct * 100).toFixed(1) + '%';
      u.inkValue.textContent = infinite ? '∞' : String(Math.ceil(shown));
      u.inkMeter.classList.toggle('low', !infinite && shown < 26);
      u.inkMeter.classList.toggle('infinite', infinite);
      const cp = L.clamp(this.colorAmt > 0.98 ? 100 : this.colorScore, 0, 100);
      u.colorFill.style.width = cp.toFixed(1) + '%';
      u.colorValue.textContent = Math.round(cp) + '%';
    }

    /* ------------------------- input & update ------------------------- */
    loop(now) {
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      if (dt > 0) {
        this.update(dt);
        this.render();
      }
      this.input.endFrame();
      requestAnimationFrame(this.loop);
    }

    update(dt) {
      this.t += dt;
      if (this.state === 'title') { this.audio.update(dt); return; }
      if (!this.level) return;

      this.updateParticles(dt);
      this.updateBlooms(dt);
      if (this.state === 'paused') {
        if (this.input.justPressed('Escape')) this.resumeGame();
        return;
      }
      if (this.state === 'complete') {
        if (this.input.justPressed('Enter', 'Space')) {
          if (this.levelIndex >= L.LEVELS.length - 1) this.openEnding();
          else this.startLevel(this.levelIndex + 1);
        }
        this.completeT += dt;
        this.colorAmt = 1;
        return;
      }
      if (this.state === 'ending') {
        if (this.input.justPressed('Escape')) this.showTitle();
        this.endingT += dt;
        this.colorAmt = 1;
        if (Math.random() < dt * 8) this.spawnPetal();
        return;
      }

      this.audio.update(dt);
      this.updateHintTimer(dt);
      this.updateScarf(dt);
      this.updateCamera(dt);

      if (this.state === 'intro') {
        if (this.input.justPressed('Escape')) this.pauseGame();
        this.introT += dt;
        this.player.blink -= dt;
        if (this.player.blink < 0) this.player.blink = 2 + Math.random() * 4;
        if (this.introT > 1.15) this.state = 'playing';
        this.updateHUD();
        return;
      }

      if (this.state === 'playing') {
        if (this.player.dead) {
          this.player.deadT += dt;
          if (this.player.deadT > 0.9) this.respawnPlayer();
          this.updateHUD();
          return;
        }
        this.handleGlobalKeys();
        this.handleFrameInput();
        this.acc = Math.min(this.acc + dt, 0.08);
        let guard = 0;
        while (this.acc >= STEP && guard < 7) {
          this.fixedStep(STEP);
          this.acc -= STEP;
          guard++;
          if (this.state !== 'playing') break;
        }
        this.updateDrawing(dt);
        this.updateHUD();
        return;
      }

      if (this.state === 'completing') {
        this.completeT += dt;
        this.colorAmt = L.easeOutCubic(L.clamp(this.completeT / 2.4, 0, 1));
        this.colorScore = 100;
        this.shake = Math.max(0, this.shake - dt * 14);
        this.updateHUD();
        if (this.completeT > 3.1 && !this.completionOpened) this.openComplete();
        return;
      }
    }

    handleGlobalKeys() {
      const inp = this.input;
      if (inp.justPressed('Escape')) this.pauseGame();
      if (inp.justPressed('KeyR')) this.startLevel(this.levelIndex);
      if (inp.justPressed('KeyM')) this.toggleMute();
    }

    handleFrameInput() {
      const inp = this.input;
      if (inp.justPressed('Space', 'ArrowUp', 'KeyW')) this.player.jumpBuffer = 0.13;
      if (inp.justPressed('Escape')) return;
    }

    fixedStep(dt) {
      const p = this.player, lv = this.level;
      if (!p || p.dead) return;
      this.stats.time += dt;
      p.invuln = Math.max(0, p.invuln - dt);
      p.blink -= dt;
      if (p.blink < 0) p.blink = 2 + Math.random() * 4;
      p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

      if (p.onGround) p.coyote = 0.1;
      else p.coyote = Math.max(0, p.coyote - dt);

      const drawing = !!this.currentStroke;
      const cap = drawing ? 245 : 345;
      const ax = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      const accel = p.onGround ? 3000 : 1900;
      if (ax !== 0) {
        p.vx += ax * accel * dt;
        p.facing = ax;
      } else {
        p.vx = L.approach(p.vx, 0, (p.onGround ? 2600 : 500) * dt);
      }
      const wind = this.windAt(p.x, p.y);
      this.inWind = !!wind;
      this.windMul = 1;
      if (wind) {
        const d = this.nearestStrokeDist(p.x, p.y);
        const shelter = L.clamp(1 - d / 195, 0, 1);
        this.windMul = 1 - 0.9 * shelter;
        p.vx += wind.dir * wind.strength * this.windMul * dt;
        if (this.windMul > 0.55 && !this.hintsSeen.wind) {
          this.hintsSeen.wind = true;
          this.showHint('风在推你。', '画一道墨墙，靠近它——风会绕开。', 6);
          this.audio.whisper();
        }
      }
      const vcap = wind ? 760 : cap;
      p.vx = L.clamp(p.vx, -vcap, vcap);
      if (!ax && !wind && Math.abs(p.vx) < 4) p.vx = 0;

      if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
        p.vy = -780;
        p.onGround = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        this.audio.jump();
        this.burst(p.x, p.y + 14, lv.palette[3], 6, 70, 'dot', 0.4);
      }

      let gravity = 2050;
      if (p.vy < 0 && !this.input.jump) gravity = 3050;
      else if (p.vy < 0) gravity = 1880;
      else if (p.vy > 0) gravity = 2400;
      p.vy += gravity * dt;
      p.vy = Math.min(p.vy, 1180);

      const wasGround = p.onGround;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.onGround = false;
      this.collide();

      // world edges
      if (p.x < p.r) { p.x = p.r; if (p.vx < 0) p.vx = 0; }
      if (p.x > lv.bounds.w - p.r) { p.x = lv.bounds.w - p.r; if (p.vx > 0) p.vx = 0; }

      if (!wasGround && p.onGround) {
        this.audio.land();
        this.shake = Math.min(6, Math.abs(p.vy) * 0.006);
        this.burst(p.x, p.y + 15, lv.palette[2], 5, 50, 'dot', 0.35);
      }

      p.runPhase += Math.abs(p.vx) * dt * 0.05;

      this.updateStrokeLife(dt);
      this.checkMist(dt);

      if (!lv.infiniteInk) {
        if (!this.inMist && !this.currentStroke) {
          const still = p.onGround && Math.abs(p.vx) < 18;
          const rate = still ? 10 : 4.2;
          this.ink = Math.min(100, this.ink + rate * dt);
        }
      }

      this.checkInteractions();
      if (p.y > lv.bounds.h + 240) this.die();
    }

    collide() {
      const p = this.player, lv = this.level;
      for (let iter = 0; iter < 3; iter++) {
        for (const s of lv.solids) this.circleRect(s);
        for (const s of lv.oneways || []) this.circleOneWay(s);
        for (const st of this.strokes) {
          if (st.life <= 1.0) continue;
          for (let i = 0; i < st.points.length - 1; i++) {
            this.circleSegment(st.points[i], st.points[i + 1], 7.5);
          }
        }
      }
    }

    contact(nx, ny) {
      const p = this.player;
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) {
        p.vx -= vn * nx;
        p.vy -= vn * ny;
      }
      if (ny < -0.5) p.onGround = true;
    }

    circleRect(s) {
      const p = this.player, r = p.r;
      if (p.x + r < s.x || p.x - r > s.x + s.w || p.y + r < s.y || p.y - r > s.y + s.h) return;
      const cx = L.clamp(p.x, s.x, s.x + s.w);
      const cy = L.clamp(p.y, s.y, s.y + s.h);
      let dx = p.x - cx, dy = p.y - cy;
      let d2 = dx * dx + dy * dy;
      if (d2 > r * r) return;
      if (d2 < 0.0001) {
        const left = p.x - s.x, right = s.x + s.w - p.x;
        const top = p.y - s.y, bottom = s.y + s.h - p.y;
        const m = Math.min(left, right, top, bottom);
        if (m === top) { p.y = s.y - r; this.contact(0, -1); }
        else if (m === bottom) { p.y = s.y + s.h + r; this.contact(0, 1); }
        else if (m === left) { p.x = s.x - r; this.contact(-1, 0); }
        else { p.x = s.x + s.w + r; this.contact(1, 0); }
        return;
      }
      const d = Math.sqrt(d2);
      const nx = dx / d, ny = dy / d;
      p.x += nx * (r - d);
      p.y += ny * (r - d);
      this.contact(nx, ny);
    }

    circleOneWay(s) {
      const p = this.player, r = p.r;
      if (p.vy < 0) return;
      if (p.x + r < s.x || p.x - r > s.x + s.w) return;
      const prevBottom = p.y - p.vy * STEP + r;
      if (prevBottom > s.y + 6) return;
      if (p.y + r > s.y && p.y < s.y + 20) {
        p.y = s.y - r;
        if (p.vy > 0) p.vy = 0;
        p.onGround = true;
      }
    }

    circleSegment(a, b, rr) {
      const p = this.player, r = p.r;
      const abx = b.x - a.x, aby = b.y - a.y;
      const apx = p.x - a.x, apy = p.y - a.y;
      const len2 = abx * abx + aby * aby;
      let t = len2 > 0 ? (apx * abx + apy * aby) / len2 : 0;
      t = L.clamp(t, 0, 1);
      const qx = a.x + abx * t, qy = a.y + aby * t;
      const dx = p.x - qx, dy = p.y - qy;
      const d2 = dx * dx + dy * dy;
      const rad = r + rr;
      if (d2 > rad * rad) return;
      const d = Math.sqrt(d2) || 0.0001;
      const nx = dx / d, ny = dy / d;
      p.x += nx * (rad - d);
      p.y += ny * (rad - d);
      this.contact(nx, ny);
    }

    updateStrokeLife(dt) {
      for (let i = this.strokes.length - 1; i >= 0; i--) {
        const s = this.strokes[i];
        const mid = s.points[(s.points.length / 2) | 0];
        const zone = this.mistAt(mid.x, mid.y);
        s.life -= dt * (zone ? zone.strength : 1);
        if (s.life <= 0) {
          this.strokes.splice(i, 1);
          const rng = L.mulberry32(s.seed + 7);
          for (let k = 0; k < 10; k++) {
            const pt = s.points[(rng() * s.points.length) | 0];
            this.addParticle({
              type: 'spark', x: pt.x + (rng() - 0.5) * 8, y: pt.y + (rng() - 0.5) * 8,
              vx: (rng() - 0.5) * 50, vy: -20 - rng() * 60,
              life: 0.7 + rng() * 0.7, maxLife: 1.2, size: 1.3, color: s.c1, alpha: 0.6
            });
          }
        }
      }
    }

    checkMist() {
      const p = this.player;
      const zone = this.mistAt(p.x, p.y);
      const was = this.inMist;
      this.inMist = !!zone;
      if (!was && this.inMist) {
        this.showHint('雾正在吞噬墨迹。', '墨线在这里撑不了多久，快一些。', 6);
        this.audio.whisper();
      }
    }

    checkInteractions() {
      const p = this.player, lv = this.level;
      for (const pu of lv.pickups) {
        if (pu.taken) continue;
        if (L.dist(p.x, p.y, pu.x, pu.y) > 36) continue;
        pu.taken = true;
        this.audio.pickup();
        this.shake = 2;
        this.burst(pu.x, pu.y, lv.palette[3], 18, 130, 'petal', 0.9);
        this.addParticle({ type: 'ring', x: pu.x, y: pu.y, vx: 0, vy: 0, life: 0.7, maxLife: 0.7, size: 10, color: lv.palette[4], alpha: 0.7 });
        this.blooms.push({ x: pu.x, y: pu.y, r: pu.kind === 'seed' ? (pu.radius || 300) : 100, color: lv.palette[pu.kind === 'seed' ? 3 : 4], alpha: 0.9, t: 0 });
        if (lv.infiniteInk) {
          this.addParticle({ type: 'text', x: pu.x, y: pu.y - 20, vx: 0, vy: -28, life: 1.2, maxLife: 1.2, size: 15, color: lv.palette[0], text: '色彩 +' });
        } else if (pu.amount > 0) {
          this.ink = Math.min(100, this.ink + pu.amount);
          this.addParticle({ type: 'text', x: pu.x, y: pu.y - 20, vx: 0, vy: -28, life: 1.2, maxLife: 1.2, size: 15, color: lv.palette[0], text: '墨 +' + pu.amount });
        }
        if (pu.kind === 'seed') {
          for (const m of lv.mists) {
            if (pu.x > m.x - 500 && pu.x < m.x + m.w + 500 && pu.y > m.y - 500 && pu.y < m.y + m.h + 500) {
              m.clearings.push({ x: pu.x, y: pu.y, r: pu.radius || 300 });
            }
          }
          this.toast('色彩之种 · 雾散开了一角');
          this.colorScore = Math.min(94, this.colorScore + 14);
        }
      }

      for (const c of lv.checkpoints) {
        if (c.active) continue;
        if (L.dist(p.x, p.y, c.x, c.y - 10) > 58) continue;
        c.active = true;
        this.respawn = { x: c.x, y: c.y - 20 };
        this.ink = 100;
        this.colorScore = Math.min(94, this.colorScore + 12);
        this.audio.checkpoint();
        this.toast('灯亮了 · 墨已满');
        this.shake = 3;
        this.blooms.push({ x: c.x, y: c.y - 20, r: 190, color: lv.palette[2], alpha: 0.8, t: 0 });
        this.burst(c.x, c.y - 50, lv.palette[2], 24, 120, 'spark', 1);
        this.addParticle({ type: 'ring', x: c.x, y: c.y - 50, vx: 0, vy: 0, life: 1.1, maxLife: 1.1, size: 16, color: lv.palette[2], alpha: 0.8 });
      }

      const g = lv.goal;
      if (Math.abs(p.x - g.x) < 88 && p.y > g.y - 200 && p.y < g.y + 20) {
        this.completeLevel();
      }

      if (Math.abs(p.x - lv.goal.x) < 520 && !lv._whisperHeard) {
        lv._whisperHeard = true;
        this.audio.whisper();
      }
    }

    die() {
      const p = this.player;
      if (p.dead || this.state !== 'playing') return;
      p.dead = true;
      p.deadT = 0;
      p.vx = 0; p.vy = 0;
      this.stats.deaths++;
      this.cancelStroke();
      this.audio.death();
      this.audio.brush(false);
      this.shake = 12;
      this.burst(p.x, p.y, this.level.palette[1], 18, 120, 'petal', 1);
      this.hideHint();
    }

    respawnPlayer() {
      const p = this.player;
      p.x = this.respawn.x;
      p.y = this.respawn.y;
      p.vx = 0; p.vy = 0;
      p.dead = false;
      p.deadT = 0;
      p.invuln = 1.2;
      this.ink = 100;
      this.updateCamera(1, true);
      this.audio.checkpoint();
      this.burst(p.x, p.y, this.level.palette[2], 16, 90, 'dot', 0.8);
      this.showHint('没关系。', '墨还在，路也还在。', 3.6);
    }

    /* ------------------------- drawing ------------------------- */
    beginStroke() {
      if (!this.player || this.player.dead) return;
      if (this.ink < 4) {
        this.showHint('墨快用尽了。', '双脚落地、站定片刻，墨会慢慢回来。', 4);
        return;
      }
      if (this.ink < 24 && !this.hintsSeen.lowInk) {
        this.hintsSeen.lowInk = true;
        this.showHint('墨不多了。', '落地站定，墨会回得快一些。', 4);
      }
      const w = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
      const palette = this.level.palette;
      const idx = this.stats.strokes + this.strokeSerial;
      this.currentStroke = {
        points: [{ x: w.x, y: w.y }],
        length: 0,
        cost: 0,
        c1: palette[idx % palette.length],
        c2: palette[(idx + 4) % palette.length],
        seed: (this.strokeSerial * 7919 + 13) % 100000,
        limited: false
      };
      this.strokeSerial++;
      this.audio.brush(true, 0.2);
      this.addParticle({
        type: 'bloom', x: w.x, y: w.y, vx: 0, vy: 0,
        life: 0.55, maxLife: 0.55, size: 42, color: palette[3], alpha: 0.5
      });
    }

    addStrokePoint(w) {
      const st = this.currentStroke;
      if (!st) return;
      const last = st.points[st.points.length - 1];
      const d = L.dist(last.x, last.y, w.x, w.y);
      if (d < 4.5) return;
      if (st.limited) return;
      const capCost = this.level.infiniteInk ? Infinity : this.ink - 2;
      if (st.length + d > MAX_STROKE || st.cost + d * INK_COST > capCost) {
        st.limited = true;
        this.audio.brush(false);
        return;
      }
      st.points.push({ x: w.x, y: w.y });
      st.length += d;
      st.cost += d * INK_COST;
      this.audio.brush(true, L.clamp(d / 18, 0, 1));
      if (st.points.length % 3 === 0) {
        this.addParticle({
          type: 'dot', x: w.x, y: w.y, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 30,
          life: 0.7, maxLife: 0.7, size: 1.4 + Math.random() * 1.6, color: st.c1, alpha: 0.7
        });
      }
      if (this.player && Math.abs(this.player.vx) < 20) {
        this.player.facing = w.x >= this.player.x ? 1 : -1;
      }
    }

    endStroke() {
      const st = this.currentStroke;
      this.currentStroke = null;
      this.audio.brush(false);
      if (!st) return;
      if (st.points.length < 2 || st.length < 16) return;
      const palette = this.level.palette;
      const life = this.level.strokeLife;
      const stroke = {
        points: st.points,
        length: st.length,
        c1: st.c1,
        c2: st.c2,
        seed: st.seed,
        life,
        maxLife: life
      };
      this.strokes.push(stroke);
      this.stats.strokes++;
      this.colorScore = Math.min(94, this.colorScore + 2.6);
      if (!this.level.infiniteInk) this.ink = Math.max(0, this.ink - st.cost);
      else this.ink = 100;
      this.audio.stroke(this.stats.strokes, 1 + (this.levelIndex * 0.03));
      this.shake = Math.max(this.shake, 1.8);

      const mid = st.points[(st.points.length / 2) | 0];
      this.blooms.push({ x: mid.x, y: mid.y, r: 70 + st.length * 0.35, color: st.c1, alpha: 0.55, t: 0 });
      if (this.blooms.length > 26) this.blooms.shift();

      const rng = L.mulberry32(st.seed + 3);
      const marks = Math.min(26, Math.floor(st.length / 14));
      for (let i = 0; i < marks; i++) {
        const pt = st.points[(rng() * st.points.length) | 0];
        this.addParticle({
          type: rng() > 0.55 ? 'petal' : 'spark',
          x: pt.x + (rng() - 0.5) * 12, y: pt.y + (rng() - 0.5) * 12,
          vx: (rng() - 0.5) * 90, vy: -20 - rng() * 90,
          life: 0.8 + rng() * 0.9, maxLife: 1.7, size: 1.4 + rng() * 2.2,
          color: palette[(rng() * palette.length) | 0], alpha: 0.85,
          rot: rng() * TAU, spin: (rng() - 0.5) * 4, gravity: 40
        });
      }
      this.addParticle({
        type: 'bloom', x: mid.x, y: mid.y,
        vx: 0, vy: 0, life: 1.1, maxLife: 1.1, size: 22, color: st.c2, alpha: 0.4
      });

      if (this.strokes.length > MAX_STROKES) {
        const old = this.strokes[this.strokes.length - 1 - MAX_STROKES];
        if (old) old.life = Math.min(old.life, 2.2);
      }
      this.updateHUD();
    }

    cancelStroke() {
      this.currentStroke = null;
      this.audio.brush(false);
    }

    updateDrawing() {
      const m = this.input.mouse;
      if (this.state !== 'playing' || this.player.dead) return;
      if (m.pressed && !this.currentStroke) this.beginStroke();
      if (!this.currentStroke) return;
      if (m.down) {
        this.addStrokePoint(this.screenToWorld(m.x, m.y));
      } else {
        this.endStroke();
      }
    }

    completeLevel() {
      if (this.state !== 'playing' && this.state !== 'intro') return;
      this.state = 'completing';
      this.completeT = 0;
      this.completionOpened = false;
      this.cancelStroke();
      this.audio.brush(false);
      this.audio.complete();
      this.audio.completePlayed = true;
      this.stats.time = Math.max(this.stats.time, 0.1);
      this.shake = 8;
      const g = this.level.goal;
      this.player.x = g.x;
      this.player.y = g.y - 15;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.onGround = true;
      this.updateCamera(1, true);
      this.blooms.push({ x: g.x, y: g.y - 120, r: 1100, color: this.level.palette[3], alpha: 1, t: 0 });
      // colour spreads through the places you have already touched
      this.level.checkpoints.forEach((c, i) => {
        if (!c.active) return;
        this.blooms.push({ x: c.x, y: c.y - 60, r: 420, color: this.level.palette[(i + 2) % this.level.palette.length], alpha: 0.85, t: 0 });
      });
      for (let i = 0; i < 7; i++) {
        this.blooms.push({
          x: g.x - 900 + i * 300,
          y: g.y - 260 + Math.sin(i * 1.7) * 170,
          r: 260 + (i % 3) * 70,
          color: this.level.palette[i % this.level.palette.length],
          alpha: 0.55,
          t: 0
        });
      }
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * TAU;
        const sp = 60 + Math.random() * 330;
        this.addParticle({
          type: Math.random() > 0.45 ? 'petal' : 'spark',
          x: g.x, y: g.y - 100,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100,
          life: 1.4 + Math.random() * 1.6, maxLife: 3,
          size: 1.5 + Math.random() * 3.2,
          color: this.level.palette[(Math.random() * this.level.palette.length) | 0],
          alpha: 0.9, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 6, gravity: 80
        });
      }
      this.ui.hint.classList.remove('show');
      this.colorScore = 100;
    }

    openComplete() {
      this.completionOpened = true;
      this.state = 'complete';
      this.ui.hud.classList.remove('on');
      const lv = this.level;
      const wasDone = this.progress.completed.includes(lv.id);
      if (!wasDone) {
        this.progress.completed.push(lv.id);
        this.progress.totalTime += this.stats.time;
        this.progress.totalStrokes += this.stats.strokes;
      }
      this.progress.best[lv.id] = Math.min(this.progress.best[lv.id] || Infinity, this.stats.time);
      let next = 0;
      while (next < L.LEVELS.length && this.progress.completed.includes(L.LEVELS[next].id)) next++;
      this.progress.next = next;
      this.progress.runs = (this.progress.runs || 0) + (wasDone ? 0 : 1);
      this.saveProgress();

      this.ui.completeTitle.textContent = `${lv.no} · ${lv.name}`;
      this.ui.completeLine.textContent = COMPLETE_LINES[lv.id] || '';
      this.ui.statTime.textContent = L.formatTime(this.stats.time);
      this.ui.statStrokes.textContent = String(this.stats.strokes);
      this.ui.statColor.textContent = '100%';
      const last = this.levelIndex >= L.LEVELS.length - 1;
      this.ui.btnNext.textContent = last ? '拾起颜色' : '继续前行';
      this.ui.completeScreen.classList.add('show');
      this.ui.endingScreen.classList.remove('show');
    }

    openEnding() {
      this.state = 'ending';
      this.endingT = 0;
      this.colorAmt = 1;
      this.ui.completeScreen.classList.remove('show');
      this.ui.hud.classList.remove('on');
      this.ui.endingScreen.classList.add('show');
      const mins = Math.max(1, Math.round((this.progress.totalTime || 0) / 60));
      this.ui.endingStats.textContent = `${L.LEVELS.length} 个章节 · ${mins} 分钟 · ${this.progress.totalStrokes || 0} 笔`;
      this.ui.endingDots.innerHTML = L.LEVELS.map((lv, i) =>
        `<i style="--c:${lv.palette[i % lv.palette.length]}" class="${this.progress.completed.includes(lv.id) ? 'on' : ''}"></i>`
      ).join('');
      this.audio.complete();
      const g = this.level.goal;
      this.updateCamera(1, true);
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * TAU, sp = 40 + Math.random() * 260;
        this.addParticle({
          type: Math.random() > 0.4 ? 'petal' : 'spark',
          x: g.x + (Math.random() - 0.5) * 300, y: g.y - 100 + (Math.random() - 0.5) * 200,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: 2 + Math.random() * 2, maxLife: 4,
          size: 1.5 + Math.random() * 3,
          color: this.level.palette[(Math.random() * this.level.palette.length) | 0],
          alpha: 0.9, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 6, gravity: 30
        });
      }
    }

    /* ------------------------- particles / world ------------------------- */
    addParticle(q) {
      if (this.particles.length > 650) this.particles.shift();
      q.maxLife = q.maxLife || q.life || 1;
      q.vx = q.vx || 0; q.vy = q.vy || 0;
      q.gravity = q.gravity == null ? 0 : q.gravity;
      q.rot = q.rot || 0; q.spin = q.spin || 0;
      q.alpha = q.alpha == null ? 1 : q.alpha;
      this.particles.push(q);
    }

    burst(x, y, color, n, speed, type, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = speed * (0.25 + Math.random() * 0.9);
        this.addParticle({
          type: type || 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: (life || 0.7) * (0.6 + Math.random() * 0.8),
          maxLife: life || 0.7, size: 1.2 + Math.random() * 2.6,
          color, alpha: 0.8, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 5,
          gravity: type === 'petal' ? 60 : 10
        });
      }
    }

    spawnPetal() {
      const cols = this.level.palette;
      this.addParticle({
        type: 'petal',
        x: this.cam.x + Math.random() * this.view.w,
        y: this.cam.y - 40,
        vx: -20 + Math.random() * 40, vy: 30 + Math.random() * 40,
        life: 4 + Math.random() * 3, maxLife: 7,
        size: 1.6 + Math.random() * 2.6,
        color: cols[(Math.random() * cols.length) | 0],
        alpha: 0.8, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 3, gravity: 5
      });
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const q = this.particles[i];
        q.life -= dt;
        if (q.life <= 0) { this.particles.splice(i, 1); continue; }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += q.gravity * dt;
        q.vx *= 1 - 0.7 * dt;
        q.rot += q.spin * dt;
        if (q.type === 'ring') q.size += 120 * dt;
        if (q.type === 'bloom') q.size += 40 * dt;
      }
    }

    updateBlooms(dt) {
      for (const b of this.blooms) {
        if (b.t != null) b.t += dt;
      }
    }

    updateScarf(dt) {
      const p = this.player;
      if (!p || !p.scarf.length) return;
      const targetX = p.x - p.facing * 7;
      const targetY = p.y - 30;
      p.scarf[0].x = targetX;
      p.scarf[0].y = targetY;
      for (let i = 1; i < p.scarf.length; i++) {
        const q = p.scarf[i], prev = p.scarf[i - 1];
        const tx = prev.x - p.facing * 6.2 - p.vx * 0.012;
        const ty = prev.y + 2.4 + Math.sin(this.t * 5 + i * 0.9) * 3.1;
        q.x += (tx - q.x) * Math.min(1, 14 * dt);
        q.y += (ty - q.y) * Math.min(1, 14 * dt);
      }
    }

    updateCamera(dt, snap) {
      if (!this.player) return;
      const p = this.player, v = this.view, lv = this.level;
      const mw = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
      let tx = p.x - v.w / 2 + L.clamp((mw.x - p.x) * 0.1, -70, 70) + p.vx * 0.13;
      let ty = p.y - v.h * 0.55 + L.clamp(p.vy * 0.06, -60, 70);
      const maxX = Math.max(0, lv.bounds.w - v.w);
      const maxY = Math.max(0, lv.bounds.h - v.h);
      tx = L.clamp(tx, 0, maxX);
      ty = L.clamp(ty, 0, maxY);
      if (lv.bounds.w < v.w) tx = (lv.bounds.w - v.w) / 2;
      if (lv.bounds.h < v.h) ty = (lv.bounds.h - v.h) / 2;
      const k = snap ? 1 : 1 - Math.exp(-4.8 * dt);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
      this.shake = Math.max(0, this.shake - dt * 26);
    }

    screenToWorld(x, y) {
      return { x: this.cam.x + x / this.scale, y: this.cam.y + y / this.scale };
    }

    mistAt(x, y) {
      if (!this.level) return null;
      for (const m of this.level.mists) {
        if (x < m.x || x > m.x + m.w || y < m.y || y > m.y + m.h) continue;
        let clear = false;
        for (const c of m.clearings) {
          if (L.dist(x, y, c.x, c.y) < c.r) { clear = true; break; }
        }
        if (!clear) return m;
      }
      return null;
    }

    windAt(x, y) {
      if (!this.level) return null;
      for (const w of this.level.winds) {
        if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return w;
      }
      return null;
    }

    nearestStrokeDist(x, y) {
      let best = 99999;
      for (const s of this.strokes) {
        if (s.life <= 1) continue;
        for (let i = 0; i < s.points.length - 1; i++) {
          const a = s.points[i], b = s.points[i + 1];
          const abx = b.x - a.x, aby = b.y - a.y;
          const l2 = abx * abx + aby * aby;
          let t = l2 ? ((x - a.x) * abx + (y - a.y) * aby) / l2 : 0;
          t = L.clamp(t, 0, 1);
          const dx = x - (a.x + abx * t), dy = y - (a.y + aby * t);
          best = Math.min(best, dx * dx + dy * dy);
        }
      }
      return Math.sqrt(best);
    }

    updateHintTimer(dt) {
      if (this.hintTimer > 0) {
        this.hintTimer -= dt;
        if (this.hintTimer <= 0) this.hideHint();
      }
    }

    /* ------------------------- render ------------------------- */
    drawGoalMarker(ctx, w, h) {
      if (!this.level || !this.player) return;
      const g = this.level.goal;
      const sx = (g.x - this.cam.x) * this.scale;
      const sy = (g.y - 100 - this.cam.y) * this.scale;
      if (sx > 90 && sx < w - 90 && sy > 160 && sy < h - 180) return;
      const dx = sx - w / 2, dy = sy - h / 2;
      const tx = Math.abs(dx) > 1 ? (w / 2 - 92) / Math.abs(dx) : Infinity;
      const ty = Math.abs(dy) > 1 ? (h / 2 - (dy < 0 ? 176 : 196)) / Math.abs(dy) : Infinity;
      const t = Math.min(tx, ty, 1);
      const cx = w / 2 + dx * t;
      const cy = h / 2 + dy * t;
      const ang = Math.atan2(dy, dx);
      const col = this.level.palette[3];
      const pulse = 0.72 + 0.28 * Math.sin(this.t * 2.6);
      ctx.save();
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      halo.addColorStop(0, L.rgba(col, 0.2 * pulse));
      halo.addColorStop(0.45, L.rgba(col, 0.07 * pulse));
      halo.addColorStop(1, L.rgba(col, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, 120, 0, TAU); ctx.fill();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(2, -5.5);
      ctx.lineTo(4.5, 0);
      ctx.lineTo(2, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-ang);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fffdf4';
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill();
      ctx.restore();
    }

    render() {
      const ctx = this.ctx;
      const w = this.cssW, h = this.cssH;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (this.state === 'title') {
        A.drawTitleScene(ctx, w, h, this.t, this.titleLevel);
        A.drawVignette(ctx, w, h);
        return;
      }
      if (!this.level) return;

      A.drawPaper(ctx, w, h, this.level, this.t, this.colorAmt);
      ctx.save();
      ctx.scale(this.scale, this.scale);
      A.drawSky(ctx, this.scene, this.cam, this.view, this.t, this.colorAmt, this.level);
      A.drawAmbient(ctx, this.scene, this.cam, this.view, this.t, this.colorAmt, this.level);

      const sh = this.shake;
      const ox = (Math.random() - 0.5) * sh;
      const oy = (Math.random() - 0.5) * sh;
      ctx.translate(-this.cam.x + ox, -this.cam.y + oy);

      A.drawParallax(ctx, this.scene, this.cam, this.t, this.colorAmt, this.level);

      for (const b of this.blooms) {
        const k = b.t != null ? L.easeOutCubic(L.clamp(b.t / 1.1, 0, 1)) : 1;
        A.drawBloom(ctx, { x: b.x, y: b.y, r: b.r * k, color: b.color, alpha: b.alpha * (1 - Math.min(0.35, (b.t || 0) * 0.04)) });
      }

      for (let i = 0; i < this.level.mists.length; i++) {
        A.drawMist(ctx, this.level.mists[i], this.scene.mists[i], this.t, this.colorAmt, false);
      }
      for (let i = 0; i < this.level.winds.length; i++) {
        A.drawWind(ctx, this.level.winds[i], this.scene.windSeeds[i], this.t);
      }

      for (const s of this.level.solids) A.drawSolid(ctx, s, this.level, this.t, this.colorAmt);

      for (const st of this.strokes) A.drawStroke(ctx, st, this.t);

      for (const ww of this.level.whispers || []) {
        if (this.player) A.drawWhisper(ctx, ww, this.player, this.t);
      }

      for (const c of this.level.checkpoints) A.drawCheckpoint(ctx, c, this.level, this.t, this.colorAmt);
      for (const pu of this.level.pickups) A.drawPickup(ctx, pu, this.level, this.t, this.colorAmt);
      A.drawGoal(ctx, this.level.goal, this.level, this.t, this.colorAmt, true);

      for (const q of this.particles) A.drawParticle(ctx, q);

      if (this.player) {
        const target = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
        const s = 1.3;
        const fx = this.player.x, fy = this.player.y + 16;
        const bt = { x: fx + (target.x - fx) / s, y: fy + (target.y - fy) / s };
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(s, s);
        ctx.translate(-fx, -fy);
        A.drawPlayer(ctx, this.player, this.t, this.level.palette, bt, !!this.currentStroke);
        ctx.restore();
      }

      if (this.currentStroke) A.drawPreview(ctx, this.currentStroke, this.t, this.level.palette);

      for (let i = 0; i < this.level.mists.length; i++) {
        A.drawMist(ctx, this.level.mists[i], this.scene.mists[i], this.t, this.colorAmt, true);
      }

      // completion wave
      if (this.state === 'completing' || this.state === 'complete' || this.state === 'ending') {
        const t = this.state === 'ending' ? 9 : this.completeT;
        const g = this.level.goal;
        for (let i = 0; i < 3; i++) {
          const u = L.clamp((t - i * 0.28) / 2.2, 0, 1);
          if (u <= 0) continue;
          ctx.save();
          ctx.globalAlpha = 0.11 * (1 - u) * (this.state === 'ending' ? 0.3 : 1);
          ctx.strokeStyle = this.level.palette[(i + 2) % this.level.palette.length];
          ctx.lineWidth = 8 * (1 - u) + 1;
          ctx.beginPath();
          ctx.arc(g.x, g.y - 100, 60 + u * 1300, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();

      if (this.inMist && this.state === 'playing') {
        ctx.save();
        ctx.fillStyle = 'rgba(246,247,242,0.16)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      A.drawVignette(ctx, w, h);
      if (this.state === 'playing' || this.state === 'intro') this.drawGoalMarker(ctx, w, h);

      if (this.state === 'completing' && this.completeT < 0.55) {
        ctx.save();
        ctx.fillStyle = `rgba(255,252,242,${0.55 * (1 - this.completeT / 0.55)})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }

    /* ------------------------- postcard ------------------------- */
    makePostcard(returnOnly) {
      this.render();
      const W = 1600, H = 1100;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      const bg = x.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#f8f1e4');
      bg.addColorStop(1, '#e6dccb');
      x.fillStyle = bg;
      x.fillRect(0, 0, W, H);
      // fibres
      for (let i = 0; i < 900; i++) {
        x.fillStyle = `rgba(80,65,45,${Math.random() * 0.025})`;
        x.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
      // image
      const ix = 80, iy = 78, iw = 1440, ih = 810;
      x.save();
      x.beginPath();
      x.roundRect(ix, iy, iw, ih, 6);
      x.clip();
      x.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, ix, iy, iw, ih);
      x.restore();
      x.strokeStyle = 'rgba(40,38,34,0.5)';
      x.lineWidth = 2;
      x.strokeRect(ix, iy, iw, ih);
      x.strokeStyle = 'rgba(255,252,242,0.7)';
      x.lineWidth = 4;
      x.strokeRect(ix + 8, iy + 8, iw - 16, ih - 16);

      // caption
      x.fillStyle = '#23222a';
      x.font = '64px "STKaiti","KaiTi","Kaiti SC",serif';
      x.fillText('光影绘梦师', 84, 970);
      x.font = '20px "Microsoft YaHei",sans-serif';
      x.fillStyle = 'rgba(40,38,42,0.6)';
      x.fillText('THE DREAM PAINTER  ·  A SHORT JOURNEY ABOUT COLOR', 88, 1000);
      const done = this.progress.completed.length;
      x.textAlign = 'right';
      x.fillStyle = 'rgba(40,38,42,0.75)';
      x.font = '22px "Microsoft YaHei",sans-serif';
      x.fillText(`${done} / ${L.LEVELS.length} 种颜色 · ${this.progress.totalStrokes || 0} 笔`, W - 86, 968);
      x.font = '16px "Microsoft YaHei",sans-serif';
      x.fillStyle = 'rgba(40,38,42,0.45)';
      x.fillText(new Date().toLocaleDateString('zh-CN'), W - 86, 998);
      // colored marks
      x.textAlign = 'left';
      const cols = L.LEVELS.map(l => l.palette[2]);
      cols.forEach((col, i) => {
        x.fillStyle = this.progress.completed.includes(L.LEVELS[i].id) ? col : 'rgba(60,58,54,0.18)';
        x.beginPath();
        x.arc(92 + i * 34, 1042, 9, 0, TAU);
        x.fill();
      });
      x.fillStyle = 'rgba(40,38,42,0.35)';
      x.font = '15px "Microsoft YaHei",sans-serif';
      x.fillText('每一笔，都是世界醒来的理由。', 280, 1048);

      const url = c.toDataURL('image/png');
      if (returnOnly) return url;
      const a = document.createElement('a');
      a.href = url;
      a.download = '光影绘梦师-归色明信片.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.toast('明信片已保存');
      return url;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game');
    if (canvas) window.__lumenGame = new Game(canvas);
  });
})();

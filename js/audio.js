/* =========================================================
   光影绘梦师 — generative audio (no external assets)
   ========================================================= */
(function () {
  const L = window.Lumen;
  const SCALE = [146.83, 164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25];

  L.AudioEngine = class AudioEngine {
    constructor() {
      this.ctx = null;
      this.muted = L.store.get('lumen-muted', false);
      this.ready = false;
      this.nextNote = 1.2;
      this.nextPad = 0;
      this.brushOn = false;
      this.brushAmt = 0;
      this.masterLevel = 0.55;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.masterLevel;
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -20;
      this.comp.knee.value = 18;
      this.comp.ratio.value = 3;
      this.comp.attack.value = 0.02;
      this.comp.release.value = 0.4;
      this.master.connect(this.comp);
      this.comp.connect(ctx.destination);

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(2.8, 2.6);
      this.wet = ctx.createGain();
      this.wet.gain.value = 0.34;
      this.reverb.connect(this.wet);
      this.wet.connect(this.master);

      this.delay = ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.31;
      this.delayFb = ctx.createGain();
      this.delayFb.gain.value = 0.26;
      this.delayWet = ctx.createGain();
      this.delayWet.gain.value = 0.18;
      this.delay.connect(this.delayFb);
      this.delayFb.connect(this.delay);
      this.delay.connect(this.delayWet);
      this.delayWet.connect(this.master);
      this.delayWet.connect(this.reverb);

      this.music = ctx.createGain();
      this.music.gain.value = 0.65;
      this.music.connect(this.master);
      this.music.connect(this.reverb);

      this._ambient();
      this._brush();
      this.ready = true;
    }

    _impulse(seconds, decay) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const n = Math.random() * 2 - 1;
          last = last * 0.72 + n * 0.28;
          data[i] = last * Math.pow(1 - t, decay) * (1 - t * 0.2);
        }
      }
      return buf;
    }

    _ambient() {
      const ctx = this.ctx;
      const pad = ctx.createGain();
      pad.gain.value = 0.0001;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.7;
      pad.connect(filter);
      filter.connect(this.music);
      const freqs = [73.42, 110.0, 146.83, 220.0];
      this.padOscs = [];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = (i - 1.5) * 4;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.26 : 0.11;
        o.connect(g);
        g.connect(pad);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.035 + i * 0.013;
        const lg = ctx.createGain();
        lg.gain.value = 0.05;
        lfo.connect(lg);
        lg.connect(g.gain);
        o.start();
        lfo.start();
        this.padOscs.push(o);
      });
      pad.gain.setTargetAtTime(0.055, ctx.currentTime, 4);
      this.padGain = pad;
    }

    _brush() {
      const ctx = this.ctx;
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.brushSrc = ctx.createBufferSource();
      this.brushSrc.buffer = buf;
      this.brushSrc.loop = true;
      this.brushFilter = ctx.createBiquadFilter();
      this.brushFilter.type = 'bandpass';
      this.brushFilter.frequency.value = 1700;
      this.brushFilter.Q.value = 0.55;
      this.brushGain = ctx.createGain();
      this.brushGain.gain.value = 0;
      this.brushSrc.connect(this.brushFilter);
      this.brushFilter.connect(this.brushGain);
      this.brushGain.connect(this.master);
      this.brushGain.connect(this.reverb);
      this.brushSrc.start();
    }

    setMuted(m) {
      this.muted = m;
      L.store.set('lumen-muted', m);
      if (this.ctx) {
        this.master.gain.setTargetAtTime(m ? 0 : this.masterLevel, this.ctx.currentTime, 0.12);
      }
    }

    toggleMute() { this.setMuted(!this.muted); }

    update(dt) {
      if (!this.ctx || !this.ready) return;
      const ctx = this.ctx;
      this.nextNote -= dt;
      if (this.nextNote <= 0) {
        this.nextNote = 2.3 + Math.random() * 2.8;
        const idx = Math.floor(Math.random() * SCALE.length);
        const f = SCALE[idx] * (Math.random() < 0.16 ? 2 : 1);
        this.note(f, 0.06, 2.4 + Math.random() * 1.4, Math.random() * 1.2 - 0.6);
        if (Math.random() < 0.3) {
          setTimeout(() => this.note(f * 1.5, 0.028, 2.0, 0.3), 260);
        }
      }
      this.nextPad -= dt;
      if (this.nextPad <= 0) {
        this.nextPad = 10 + Math.random() * 8;
        if (this.padGain) {
          const v = 0.04 + Math.random() * 0.03;
          this.padGain.gain.setTargetAtTime(v, ctx.currentTime, 2.5);
        }
      }
      if (this.brushOn) {
        this.brushFilter.frequency.setTargetAtTime(1100 + this.brushAmt * 2200, ctx.currentTime, 0.08);
        this.brushGain.gain.setTargetAtTime(0.035 + this.brushAmt * 0.035, ctx.currentTime, 0.05);
      } else {
        this.brushGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.08);
      }
    }

    brush(on, amt) {
      this.brushOn = on;
      this.brushAmt = L.clamp(amt || 0, 0, 1);
    }

    note(freq, gain, dur, pan) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.01;
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.type = 'sine';
      o.frequency.value = freq;
      o2.type = 'triangle';
      o2.frequency.value = freq * 2.001;
      const g2 = ctx.createGain();
      g2.gain.value = 0.18;
      o2.connect(g2);
      g2.connect(g);
      o.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (p) {
        p.pan.value = pan || 0;
        g.connect(p);
        p.connect(this.music);
        p.connect(this.delay);
      } else {
        g.connect(this.music);
        g.connect(this.delay);
      }
      o.start(t); o2.start(t);
      o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    }

    tone(freq, target, dur, gain, type, when) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + (when || 0);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (target) o.frequency.exponentialRampToValueAtTime(target, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      g.connect(this.reverb);
      o.start(t); o.stop(t + dur + 0.05);
    }

    noise(dur, gain, freq, q, when) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + (when || 0);
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq || 800;
      f.Q.value = q || 0.8;
      const g = ctx.createGain();
      g.gain.value = gain || 0.05;
      s.connect(f); f.connect(g); g.connect(this.master); g.connect(this.reverb);
      s.start(t);
    }

    jump() {
      this.tone(360, 620, 0.16, 0.035, 'sine');
      this.noise(0.12, 0.018, 1600, 0.7);
    }
    land() {
      this.noise(0.16, 0.055, 180, 0.9);
      this.tone(150, 90, 0.16, 0.025, 'sine');
    }
    stroke(index, pitch) {
      const f = SCALE[4 + (index % 6)] * (pitch || 1);
      this.note(f, 0.055, 2.2, (Math.random() - 0.5) * 0.6);
      this.noise(0.2, 0.04, 1200, 0.6);
    }
    pickup() {
      const base = 587.33;
      [1, 1.25, 1.5].forEach((m, i) => this.tone(base * m, base * m * 1.005, 0.5, 0.045, 'sine', i * 0.07));
    }
    checkpoint() {
      [293.66, 369.99, 440].forEach((f, i) => this.tone(f, f, 1.6, 0.05, 'sine', i * 0.09));
      this.note(587.33, 0.05, 3);
    }
    death() {
      this.tone(260, 180, 0.5, 0.045, 'sine');
      this.tone(196, 130, 0.7, 0.03, 'sine', 0.12);
      this.noise(0.3, 0.03, 500, 0.5);
    }
    complete() {
      const seq = [293.66, 369.99, 440, 587.33, 739.99, 880];
      seq.forEach((f, i) => {
        this.tone(f, f, 2.6, 0.055, 'sine', i * 0.13);
        this.note(f, 0.03, 3, (i / seq.length - 0.5) * 0.8);
      });
      this.tone(146.83, 146.83, 4, 0.05, 'triangle');
    }
    ui() { this.tone(660, 720, 0.08, 0.025, 'sine'); }
    whisper() { this.tone(880, 880, 1.2, 0.02, 'sine'); }
  };
})();

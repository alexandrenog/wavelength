import { adoptStylesheet } from './dom.js';

adoptStylesheet('visualizer.css');


// Visualizer.js
export class Visualizer {
  constructor(canvas, audioEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audioEl;

    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.running = false;
    this.animId = null;
  }

  start() {
    if (this.running) return;
    try {
      this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!this.source) {
        this.source = this.audioCtx.createMediaElementSource(this.audio);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
      this.running = true;
      this._draw();
    } catch (err) {
      // Web Audio can throw if unsupported/blocked — fail silently, same as original.
    }
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  _draw() {
    if (!this.analyser || !this.running) return;
    this.animId = requestAnimationFrame(() => this._draw());

    const W = (this.canvas.width = this.canvas.offsetWidth);
    const H = (this.canvas.height = this.canvas.offsetHeight);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    this.ctx.clearRect(0, 0, W, H);

    const centerY = H / 2;
    const barCount = 64;
    const step = data.length / barCount;
    const bw = (W / barCount) * 0.7;
    const gap = (W / barCount) * 0.3;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      for (let j = start; j < end; j++) sum += data[j];
      const v = sum / (end - start) / 255;
      const barHeight = Math.max(2, v * centerY * 0.85);
      const x = i * (bw + gap) + gap / 2;
      const hue = (i / barCount) * 240;
      this.ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      this.ctx.fillRect(x, centerY - barHeight, bw, barHeight * 2);
    }
  }
}

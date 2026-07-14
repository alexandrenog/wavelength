import { adoptStylesheet } from './dom.js';

adoptStylesheet('player.css');

// Player.js
export class Player {
  constructor(audioEl, { onTrackChange, onPlay, onPause, onTranscodeStart, onTranscodeProgress, onTranscodeDone } = {}) {
    this.audio = audioEl;
    this.playlist = [];
    this.currentIdx = -1;
    this.shuffle = false;
    this.repeat = false;

    this.onTrackChange = onTrackChange;
    this.onPlay = onPlay;
    this.onPause = onPause;
    this.onTranscodeStart = onTranscodeStart;
    this.onTranscodeProgress = onTranscodeProgress;
    this.onTranscodeDone = onTranscodeDone;

    this.audio.addEventListener('play', () => this.onPlay?.());
    this.audio.addEventListener('pause', () => this.onPause?.());
    this.audio.addEventListener('ended', () => {
      this.repeat ? this.audio.play() : this.next();
    });
  }

  setPlaylist(tracks) {
    this.playlist = tracks;
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    return this.shuffle;
  }

  toggleRepeat() {
    this.repeat = !this.repeat;
    return this.repeat;
  }

  async playIndex(idx) {
    if (idx < 0 || idx >= this.playlist.length) return;
    const track = this.playlist[idx];
    this._pendingId = track.id;
    this.currentIdx = idx;

    if (track.needs_transcoding) {
      const res = await fetch(`/api/transcode/${encodeURIComponent(track.id)}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'started') {
        this.onTranscodeStart?.(track, idx);
        await this._waitTranscode(track.id);
        if (this._pendingId !== track.id) return;
      }
      this.onTranscodeDone?.(track, idx);
    }

    if (this._pendingId !== track.id) return;
    this.onTrackChange?.(track, idx);
    this.audio.src = `/audio/${encodeURIComponent(track.id)}`;
    this.audio.play().catch(() => {});
  }

  async _waitTranscode(id) {
    for (;;) {
      const res = await fetch(`/api/transcode/${encodeURIComponent(id)}/progress`);
      const data = await res.json();
      if (this._pendingId !== id) break;
      this.onTranscodeProgress?.(data.progress);
      if (data.progress >= 100) break;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  playPause() {
    if (this.audio.src) {
      this.audio.paused ? this.audio.play() : this.audio.pause();
    } else if (this.playlist.length > 0) {
      this.playIndex(0);
    }
  }

  next() {
    if (this.playlist.length === 0) return;
    const idx = this.shuffle
      ? Math.floor(Math.random() * this.playlist.length)
      : (this.currentIdx + 1) % this.playlist.length;
    this.playIndex(idx);
  }

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    if (this.playlist.length === 0) return;
    const idx = this.shuffle
      ? Math.floor(Math.random() * this.playlist.length)
      : (this.currentIdx - 1 + this.playlist.length) % this.playlist.length;
    this.playIndex(idx);
  }
}

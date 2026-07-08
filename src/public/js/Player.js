import { adoptStylesheet } from './dom.js';

adoptStylesheet('player.css');

// Player.js
export class Player {
  constructor(audioEl, { onTrackChange, onPlay, onPause } = {}) {
    this.audio = audioEl;
    this.playlist = [];
    this.currentIdx = -1;
    this.shuffle = false;
    this.repeat = false;

    this.onTrackChange = onTrackChange;
    this.onPlay = onPlay;
    this.onPause = onPause;

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

  playIndex(idx) {
    if (idx < 0 || idx >= this.playlist.length) return;
    this.currentIdx = idx;
    const track = this.playlist[idx];
    this.audio.src = `/audio/${encodeURIComponent(track.id)}`;
    this.audio.play();
    this.onTrackChange?.(track, idx);
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

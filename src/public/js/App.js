// App.js
import { TrackList } from './TrackList.js';
import { Player } from './Player.js';
import { Visualizer } from './Visualizer.js';
import { adoptStylesheet, setStylesheetBase } from './dom.js';

adoptStylesheet('base.css', 'header.css', 'responsive.css', 'utilities.css');

// Static, trusted markup (not user data) — fine to assign via innerHTML.
const PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

export class App {
  constructor() {
    this.audio = document.getElementById('audio-el');
    this.btnPlay = document.getElementById('btn-play');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnShuffle = document.getElementById('btn-shuffle');
    this.btnRepeat = document.getElementById('btn-repeat');
    this.btnRescan = document.getElementById('btn-rescan');
    this.seekBar = document.getElementById('seek-bar');
    this.volBar = document.getElementById('vol-bar');
    this.timeCur = document.getElementById('time-cur');
    this.timeDur = document.getElementById('time-dur');
    this.npTitle = document.getElementById('np-title');
    this.npSub = document.getElementById('np-sub');
    this.trackListEl = document.getElementById('track-list');
    this.searchEl = document.getElementById('search');
    this.trackCountEl = document.getElementById('track-count');
    this.visCanvas = document.getElementById('vis-canvas');
    this.toggleArtistBtn = document.getElementById('toggle-artist');
    this.toggleAlbumBtn = document.getElementById('toggle-album');

    this.seeking = false;

    this.player = new Player(this.audio, {
      onTrackChange: (track, idx) => this._onTrackChange(track, idx),
      onPlay: () => { this.btnPlay.innerHTML = PAUSE_SVG; this.visualizer.start(); },
      onPause: () => { this.btnPlay.innerHTML = PLAY_SVG; },
    });

    this.trackList = new TrackList(this.trackListEl, {
      onSelect: idx => this.player.playIndex(idx),
    });

    this.visualizer = new Visualizer(this.visCanvas, this.audio);

    this._bindEvents();
  }

  async loadTracks() {
    const res = await fetch('/api/tracks');
    const tracks = await res.json();
    this.trackList.setTracks(tracks);
    this.player.setPlaylist(this.trackList.filtered);
    this._updateCount();
  }

  _onTrackChange(track, idx) {
    this.npTitle.textContent = track.title;
    this.npSub.textContent = `${track.artist} — ${track.album}`;
    document.title = `${track.title} · Wavelength`;
    this.trackList.setCurrentIndex(idx);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
      });
    }
  }

  _updateCount() {
    const n = this.trackList.count;
    this.trackCountEl.textContent = `${n} track${n !== 1 ? 's' : ''}`;
  }

  _refilter() {
    this.trackList.applyFilter(this.searchEl.value);
    this.player.setPlaylist(this.trackList.filtered);
    this._updateCount();
  }

  _bindEvents() {
    this.btnPlay.addEventListener('click', () => this.player.playPause());
    this.btnNext.addEventListener('click', () => this.player.next());
    this.btnPrev.addEventListener('click', () => this.player.prev());

    this.btnShuffle.addEventListener('click', () => {
      const on = this.player.toggleShuffle();
      this.btnShuffle.classList.toggle('active', on);
    });

    this.btnRepeat.addEventListener('click', () => {
      const on = this.player.toggleRepeat();
      this.btnRepeat.classList.toggle('active', on);
    });

    this.audio.addEventListener('timeupdate', () => {
      if (!this.seeking && this.audio.duration) {
        const pct = this.audio.currentTime / this.audio.duration;
        this.seekBar.value = pct;
        this.seekBar.style.setProperty('--prog', pct * 100 + '%');
        this.timeCur.textContent = this._fmt(this.audio.currentTime);
      }
    });

    this.audio.addEventListener('durationchange', () => {
      this.timeDur.textContent = this.audio.duration ? this._fmt(this.audio.duration) : '0:00';
    });

    this.seekBar.addEventListener('mousedown', () => (this.seeking = true));
    this.seekBar.addEventListener('touchstart', () => (this.seeking = true));
    this.seekBar.addEventListener('input', () => {
      const pct = parseFloat(this.seekBar.value);
      this.seekBar.style.setProperty('--prog', pct * 100 + '%');
      this.timeCur.textContent = this._fmt(pct * (this.audio.duration || 0));
    });
    this.seekBar.addEventListener('change', () => {
      if (this.audio.duration) this.audio.currentTime = parseFloat(this.seekBar.value) * this.audio.duration;
      this.seeking = false;
    });

    this.volBar.addEventListener('input', () => {
      const v = parseFloat(this.volBar.value);
      this.audio.volume = v;
      this.volBar.style.setProperty('--prog', v * 100 + '%');
    });

    this.btnRescan.addEventListener('click', async () => {
      this.btnRescan.textContent = '…';
      this.btnRescan.disabled = true;
      await fetch('/api/rescan', { method: 'POST' });
      await this.loadTracks();
      this.btnRescan.textContent = '⟳';
      this.btnRescan.disabled = false;
    });

    this.searchEl.addEventListener('input', () => this._refilter());

    this.toggleArtistBtn.addEventListener('click', () => {
      const on = !this.trackList.groupByArtist;
      this.trackList.setGroupByArtist(on);
      this.toggleArtistBtn.classList.toggle('active', on);
      this.toggleAlbumBtn.classList.toggle('active', this.trackList.groupByAlbum);
    });

    this.toggleAlbumBtn.addEventListener('click', () => {
      const on = !this.trackList.groupByAlbum;
      this.trackList.setGroupByAlbum(on);
      this.toggleArtistBtn.classList.toggle('active', this.trackList.groupByArtist);
      this.toggleAlbumBtn.classList.toggle('active', on);
    });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.audio.play());
      navigator.mediaSession.setActionHandler('pause', () => this.audio.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.player.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.player.prev());
      navigator.mediaSession.setActionHandler('seekto', event => {
        if (event.seekTime != null) this.audio.currentTime = event.seekTime;
      });
    }

    document.addEventListener('keydown', event => {
      if (event.target === this.searchEl) return;
      if (event.code === 'Space') { event.preventDefault(); this.btnPlay.click(); }
      if (event.code === 'ArrowRight') this.audio.currentTime = Math.min(this.audio.currentTime + 5, this.audio.duration || 0);
      if (event.code === 'ArrowLeft') this.audio.currentTime = Math.max(this.audio.currentTime - 5, 0);
      if (event.code === 'ArrowUp') { event.preventDefault(); this.audio.volume = Math.min(this.audio.volume + 0.05, 1); }
      if (event.code === 'ArrowDown') { event.preventDefault(); this.audio.volume = Math.max(this.audio.volume - 0.05, 0); }
    });
  }

  _fmt(seconds) {
    const m = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
}

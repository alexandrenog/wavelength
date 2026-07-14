// TrackRow.js
import { h } from './dom.js';

export class TrackRow {
  constructor(track, index, num, { active = false, onSelect } = {}) {
    this.track = track;
    this.index = index;
    this.num = num ?? index + 1;
    this.onSelect = onSelect;
    this.el = this._build(active);
  }

  _build(active) {
    const { track, index, num } = this;

    return h('div', {
      class: 'track-row' + (active ? ' active' : ''),
      dataset: { idx: String(index) },
      style: { animationDelay: `${Math.min(index * 15, 300)}ms` },
      onClick: () => this.onSelect?.(index),
    }, [
      h('div', { class: 'track-num' }, [
        h('span', { class: 'track-num-val' }, [String(num)]),
      ]),
      h('div', { class: 'track-info' }, [
        h('div', { class: 'track-title' }, [track.title]),
        h('div', { class: 'track-sub' }, [`${track.artist} · ${track.album}`]),
      ]),
      h('div', { class: 'track-artist' }, [track.artist]),
      h('div', { class: 'track-album' }, [track.album]),
      h('div', { class: 'track-ext' + (track.needs_transcoding && !track.transcoded ? ' needs-transcode' : '') }, [track.ext]),
    ]);
  }

  setActive(active) {
    this.el.classList.toggle('active', active);
  }

  setTranscoding(id) {
    const extEl = this.el.querySelector('.track-ext');
    if (!extEl) return;
    extEl.classList.remove('needs-transcode');
    extEl.classList.add('transcode-cell');
    extEl.innerHTML = '';
    extEl.append(
      Object.assign(document.createElement('div'), { className: 'transcode-progress-bar', style: 'width:0%' }),
      Object.assign(document.createElement('span'), { textContent: '0%' })
    );
  }

  setTranscoded() {
    const extEl = this.el.querySelector('.track-ext');
    if (!extEl) return;
    extEl.classList.remove('transcode-cell');
    extEl.textContent = this.track.ext;
  }

  setTranscodeProgress(pct) {
    const cell = this.el.querySelector('.transcode-cell');
    if (!cell) return;
    const bar = cell.querySelector('.transcode-progress-bar');
    const label = cell.querySelector('span');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
  }
}

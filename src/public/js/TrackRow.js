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
      h('div', { class: 'track-ext' }, [track.ext]),
    ]);
  }

  setActive(active) {
    this.el.classList.toggle('active', active);
  }
}

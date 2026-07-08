import { adoptStylesheet } from './dom.js';

adoptStylesheet('track-list.css');

// TrackList.js
import { h } from './dom.js';
import { TrackRow } from './TrackRow.js';

export class TrackList {
  constructor(container, { onSelect } = {}) {
    this.container = container;
    this.onSelect = onSelect;

    this.tracks = [];
    this.filtered = [];
    this.rows = [];
    this.currentIdx = -1;
    this.groupByArtist = false;
    this.groupByAlbum = false;
  }

  get count() {
    return this.filtered.length;
  }

  setTracks(tracks) {
    this.tracks = tracks;
    this.applyFilter('');
  }

  applyFilter(query) {
    const q = query.trim().toLowerCase();
    this.filtered = q
      ? this.tracks.filter(track =>
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q))
      : this.tracks;
    this.render();
  }

  setGroupByArtist(value) {
    this.groupByArtist = value;
    if (!value) this.groupByAlbum = false;
    this.render();
  }

  setGroupByAlbum(value) {
    if (value && !this.groupByArtist) this.groupByArtist = true;
    this.groupByAlbum = value;
    this.render();
  }

  setCurrentIndex(idx) {
    this.currentIdx = idx;
    this.rows.forEach(row => row.setActive(row.index === idx));
  }

  render() {
    this.container.replaceChildren();
    this.rows = [];

    if (this.filtered.length === 0) {
      this.container.append(this._emptyState());
      return;
    }

    if (this.groupByArtist) {
      this._renderGrouped();
    } else {
      this.filtered.forEach((track, index) => this._appendRow(track, index));
    }
  }

  _renderGrouped() {
    const byArtist = new Map();
    this.filtered.forEach((track, index) => {
      const key = track.artist || 'Unknown Artist';
      if (!byArtist.has(key)) byArtist.set(key, []);
      byArtist.get(key).push({ track, index });
    });

    for (const [artist, items] of byArtist) {
      this.container.append(h('div', { class: 'group-header' }, [artist]));

      if (this.groupByAlbum) {
        const byAlbum = new Map();
        items.forEach(({ track, index }) => {
          const key = track.album || 'Unknown Album';
          if (!byAlbum.has(key)) byAlbum.set(key, []);
          byAlbum.get(key).push({ track, index });
        });

        for (const [album, subItems] of byAlbum) {
          this.container.append(h('div', { class: 'group-subheader' }, [album]));
          subItems.forEach(({ track, index }, idx) => this._appendRow(track, index, idx + 1));
        }
      } else {
        items.forEach(({ track, index }) => this._appendRow(track, index));
      }
    }
  }

  _appendRow(track, index, num) {
    const row = new TrackRow(track, index, num, {
      active: index === this.currentIdx,
      onSelect: this.onSelect,
    });
    this.rows.push(row);
    this.container.append(row.el);
  }

  _emptyState() {
    return h('div', { class: 'empty-state' }, [
      h('div', { class: 'icon' }, ['🎵']),
      h('p', {}, ['No tracks found. Check your music path in config.yml.']),
    ]);
  }
}

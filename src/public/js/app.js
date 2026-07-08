const audio = document.getElementById('audio-el');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const btnRescan = document.getElementById('btn-rescan');
const seekBar = document.getElementById('seek-bar');
const volBar = document.getElementById('vol-bar');
const timeCur = document.getElementById('time-cur');
const timeDur = document.getElementById('time-dur');
const npTitle = document.getElementById('np-title');
const npSub = document.getElementById('np-sub');
const trackList = document.getElementById('track-list');
const searchEl = document.getElementById('search');
const trackCount = document.getElementById('track-count');
const visCanvas = document.getElementById('vis-canvas');
const visCtx = visCanvas.getContext('2d');
const toggleArtist = document.getElementById('toggle-artist');
const toggleAlbum = document.getElementById('toggle-album');

let tracks = [];
let filtered = [];
let currentIdx = -1;
let shuffle = false;
let repeat = false;
let groupByArtist = false;
let groupByAlbum = false;
let seeking = false;
let audioCtx = null;
let analyser = null;
let source = null;
let visRunning = false;
let animId = null;

// ── Fetch tracks ──
async function loadTracks() {
  const res = await fetch('/api/tracks');
  tracks = await res.json();
  applyFilter();
}

function applyFilter() {
  const q = searchEl.value.trim().toLowerCase();
  filtered = q
    ? tracks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      )
    : tracks;
  renderList();
}

function trackRowHtml(t, i, num) {
  if (num === undefined) num = i + 1;
  return `
    <div class="track-row${currentIdx === i ? ' active' : ''}" data-idx="${i}" style="animation-delay:${Math.min(i * 15, 300)}ms">
      <div class="track-num">
        <span class="track-num-val">${num}</span>
      </div>
      <div class="track-info">
        <div class="track-title">${esc(t.title)}</div>
        <div class="track-sub">${esc(t.artist)} · ${esc(t.album)}</div>
      </div>
      <div class="track-artist">${esc(t.artist)}</div>
      <div class="track-album">${esc(t.album)}</div>
      <div class="track-ext">${esc(t.ext)}</div>
    </div>
  `;
}

function renderList() {
  trackCount.textContent = `${filtered.length} track${filtered.length !== 1 ? 's' : ''}`;
  if (filtered.length === 0) {
    trackList.innerHTML = `<div class="empty-state"><div class="icon">🎵</div><p>No tracks found. Check your music path in config.yml.</p></div>`;
    return;
  }

  let html = '';

  if (groupByArtist) {
    const groups = {};
    filtered.forEach((t, i) => {
      const key = t.artist || 'Unknown Artist';
      (groups[key] ||= []).push({ t, i });
    });

    for (const [artist, items] of Object.entries(groups)) {
      html += `<div class="group-header">${esc(artist)}</div>`;

      if (groupByAlbum) {
        const subs = {};
        items.forEach(({ t, i }) => {
          const key = t.album || 'Unknown Album';
          (subs[key] ||= []).push({ t, i });
        });
        for (const [album, subItems] of Object.entries(subs)) {
          html += `<div class="group-subheader">${esc(album)}</div>`;
          subItems.forEach(({ t, i }, idx) => { html += trackRowHtml(t, i, idx + 1); });
        }
      } else {
        items.forEach(({ t, i }) => { html += trackRowHtml(t, i); });
      }
    }
  } else {
    filtered.forEach((t, i) => { html += trackRowHtml(t, i); });
  }

  trackList.innerHTML = html;

  trackList.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', () => playIndex(+row.dataset.idx));
  });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Playback ──
function playIndex(idx) {
  if (idx < 0 || idx >= filtered.length) return;
  currentIdx = idx;
  const t = filtered[idx];
  audio.src = `/audio/${encodeURIComponent(t.id)}`;
  audio.play();
  updateNowPlaying(t);
  renderList();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: t.album,
    });
  }
}

function updateNowPlaying(t) {
  npTitle.textContent = t.title;
  npSub.textContent = `${t.artist} — ${t.album}`;
  document.title = `${t.title} · Wavelength`;
}

audio.addEventListener('play', () => {
  btnPlay.textContent = '⏸';
  setupVisualizer();
});

audio.addEventListener('pause', () => {
  btnPlay.textContent = '▶';
});

audio.addEventListener('ended', () => {
  if (repeat) {
    audio.play();
  } else {
    playNext();
  }
});

audio.addEventListener('timeupdate', () => {
  if (!seeking && audio.duration) {
    const pct = audio.currentTime / audio.duration;
    seekBar.value = pct;
    seekBar.style.setProperty('--prog', (pct * 100) + '%');
    timeCur.textContent = fmt(audio.currentTime);
  }
});

audio.addEventListener('durationchange', () => {
  timeDur.textContent = audio.duration ? fmt(audio.duration) : '0:00';
});

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function playNext() {
  if (filtered.length === 0) return;
  let next;
  if (shuffle) {
    next = Math.floor(Math.random() * filtered.length);
  } else {
    next = (currentIdx + 1) % filtered.length;
  }
  playIndex(next);
}

function playPrev() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  let prev;
  if (shuffle) {
    prev = Math.floor(Math.random() * filtered.length);
  } else {
    prev = (currentIdx - 1 + filtered.length) % filtered.length;
  }
  playIndex(prev);
}

btnPlay.addEventListener('click', () => {
  if (audio.src) {
    audio.paused ? audio.play() : audio.pause();
  } else if (filtered.length > 0) {
    playIndex(0);
  }
});

btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);

btnShuffle.addEventListener('click', () => {
  shuffle = !shuffle;
  btnShuffle.classList.toggle('active', shuffle);
});

btnRepeat.addEventListener('click', () => {
  repeat = !repeat;
  btnRepeat.classList.toggle('active', repeat);
});

// ── Seek ──
seekBar.addEventListener('mousedown', () => seeking = true);
seekBar.addEventListener('touchstart', () => seeking = true);
seekBar.addEventListener('input', () => {
  const pct = parseFloat(seekBar.value);
  seekBar.style.setProperty('--prog', (pct * 100) + '%');
  timeCur.textContent = fmt(pct * (audio.duration || 0));
});
seekBar.addEventListener('change', () => {
  if (audio.duration) audio.currentTime = parseFloat(seekBar.value) * audio.duration;
  seeking = false;
});

// ── Volume ──
volBar.addEventListener('input', () => {
  const v = parseFloat(volBar.value);
  audio.volume = v;
  volBar.style.setProperty('--prog', (v * 100) + '%');
  if (analyser) analyser.gain && (analyser.gain.value = v);
});

// ── Rescan ──
btnRescan.addEventListener('click', async () => {
  btnRescan.textContent = '…';
  btnRescan.disabled = true;
  await fetch('/api/rescan', { method: 'POST' });
  await loadTracks();
  btnRescan.textContent = '⟳';
  btnRescan.disabled = false;
});

// ── Search ──
searchEl.addEventListener('input', applyFilter);

// ── Media Session API (background play on mobile) ──
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('nexttrack', playNext);
  navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  navigator.mediaSession.setActionHandler('seekto', e => {
    if (e.seekTime != null) audio.currentTime = e.seekTime;
  });
}

// ── Group toggles ──
toggleArtist.addEventListener('click', () => {
  groupByArtist = !groupByArtist;
  if (!groupByArtist) groupByAlbum = false;
  toggleArtist.classList.toggle('active', groupByArtist);
  toggleAlbum.classList.toggle('active', groupByAlbum);
  renderList();
});

toggleAlbum.addEventListener('click', () => {
  if (!groupByArtist) {
    groupByArtist = true;
    toggleArtist.classList.add('active');
  }
  groupByAlbum = !groupByAlbum;
  toggleAlbum.classList.toggle('active', groupByAlbum);
  renderList();
});

// ── Visualizer ──
function setupVisualizer() {
  if (visRunning) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (!source) {
      source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    visRunning = true;
    drawVis();
  } catch(e) {}
}

function drawVis() {
  if (!analyser) return;
  animId = requestAnimationFrame(drawVis);
  const W = visCanvas.width = visCanvas.offsetWidth;
  const H = visCanvas.height = visCanvas.offsetHeight;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  visCtx.clearRect(0, 0, W, H);

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
    const v = (sum / (end - start)) / 255;
    const barHeight = Math.max(2, v * centerY * 0.85);
    const x = i * (bw + gap) + gap / 2;
    const hue = (i / barCount) * 240;
    visCtx.fillStyle = `hsl(${hue}, 100%, 60%)`;
    visCtx.fillRect(x, centerY - barHeight, bw, barHeight * 2);
  }
}

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (e.target === searchEl) return;
  if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
  if (e.code === 'ArrowRight') { audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0); }
  if (e.code === 'ArrowLeft')  { audio.currentTime = Math.max(audio.currentTime - 5, 0); }
  if (e.code === 'ArrowUp')    { e.preventDefault(); audio.volume = Math.min(audio.volume + .05, 1); }
  if (e.code === 'ArrowDown')  { e.preventDefault(); audio.volume = Math.max(audio.volume - .05, 0); }
});

// ── Init ──
loadTracks();

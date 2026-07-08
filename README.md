# 🎵 Wavelength

A self-hosted, browser-based music player written in **Crystal** using [Kemal](https://kemalcr.com/).  
Runs as a Docker container; stream your local library from any browser — including mobile devices in the background.

---

## Features

- **Supports** MP3, WMA, M4A, OGG, FLAC
- **Background playback** on mobile via the [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) (lock-screen controls on Android & iOS)
- **HTTP Range requests** — proper seek / scrub on all browsers
- **Recursive library scanning** with configurable interval and on-demand rescan button
- **Zero public file exposure** — only files inside the configured music path are served; path traversal is blocked
- **Live filter/search** across title, artist, album
- Keyboard shortcuts: `Space` play/pause · `←/→` seek ±5s · `↑/↓` volume
- Shuffle & repeat modes
- Frequency visualiser in the player bar
- Docker Compose ready; runs as a non-root user

---

## Quick Start

### 1. Edit the config

```yaml
# config/config.yml
host: 0.0.0.0             # bind address (default: 0.0.0.0)
music_path: /music        # path inside the container (keep this)
port: 3000                # or override via the HOST env var
scan_interval: 60         # seconds between automatic rescans
```

### 2. Edit docker-compose.yml

Set the volume path to your actual music folder:

```yaml
volumes:
  - /home/you/Music:/music:ro        # ← change the left side
  - ./config/config.yml:/app/config/config.yml:ro
```

### 3. Build & run

```bash
docker compose up -d --build
```

Open **http://localhost:3000** in any browser.  
On mobile, add the page to your home screen for the best experience.

---

## Folder Naming Tips

Wavelength parses track metadata from file/folder names.  
The more structured your names, the richer the display:

| Filename | Artist | Album | Title |
|---|---|---|---|
| `Pink Floyd - The Wall - Comfortably Numb.mp3` | Pink Floyd | The Wall | Comfortably Numb |
| `Radiohead - Creep.flac` | Radiohead | Unknown Album | Creep |
| `random_track.ogg` | Unknown Artist | Unknown Album | random\_track |

---

## Development (without Docker)

Requirements: Crystal ≥ 1.10, OpenSSL, libyaml, ffprobe (optional — filename-based fallback)

```bash
# Build
shards install
crystal build src/main.cr -o wavelength

# Or use the build script (handles shards + ffprobe check)
./build.sh

# Run
./wavelength

# Hot-reload static assets into a running container
./reload-static.sh        # defaults to the "wavelength" container
```

---

## Security

- Only files whose resolved path starts with `music_path` are served.
- No directory listing or arbitrary file access is possible.
- The Docker image runs as an unprivileged user (`wavelength`).

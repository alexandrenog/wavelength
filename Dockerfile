# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM crystallang/crystal:1.12-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache \
    libc-dev \
    openssl-dev \
    openssl-libs-static \
    yaml-dev \
    zlib-dev \
    pcre-dev \
    gc-dev \
    musl-dev

# Cache shards first
COPY shard.yml shard.lock* ./
RUN shards install --production

# Copy source
COPY src/ ./src/

# Build static binary
RUN crystal build src/main.cr \
    --release \
    --static \
    -o wavelength \
    --no-debug


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies (ffprobe for audio metadata extraction)
RUN apk add --no-cache ffmpeg

# Copy binary, static assets, and config
COPY --from=builder /build/wavelength ./wavelength
COPY --from=builder /build/src/public/ ./src/public/
COPY config/ ./config/

# Music is mounted at runtime — create the default mount point
RUN mkdir -p /music

EXPOSE 3000

# Run as non-root
RUN addgroup -S wavelength && adduser -S wavelength -G wavelength
USER wavelength

CMD ["./wavelength"]

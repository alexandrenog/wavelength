require "mime"

class AudioAction < TrackAction
  MIME_TYPES = {
    "mp3"  => "audio/mpeg",
    "wma"  => "audio/x-ms-wma",
    "m4a"  => "audio/mp4",
    "ogg"  => "audio/ogg",
    "flac" => "audio/flac",
  }

  @[Get("/audio/:id")]
  def stream(http_context)
    track = find_track_or_404(http_context)
    return "Track not found" unless track

    abs_path = resolve_track_path(track)
    unless abs_path
      http_context.response.status_code = 404
      return "File not found on disk"
    end

    if AppConfig::UNSUPPORTED_CODECS.includes?(track.codec)
      serve_path = ensure_transcoded(abs_path, track.filename)
      unless serve_path
        http_context.response.status_code = 500
        return "Transcoding failed for this track"
      end
      serve_direct(http_context, serve_path, "mp3")
    else
      serve_direct(http_context, abs_path, track.ext)
    end
  end

  private def ensure_transcoded(source_path : String, track_filename : String) : String?
    cache_path = Scanner.cache_path_for(track_filename)

    return cache_path if File.exists?(cache_path)

    Dir.mkdir_p(AppConfig::CACHE_DIR)
    tmp_path = cache_path + ".tmp"

    # If a recent async transcode is in progress, don't start a duplicate
    if File.exists?(tmp_path)
      mtime = File.info(tmp_path).modification_time
      return nil if Time.utc - mtime < 30.seconds
      File.delete(tmp_path)
    end

    result = Process.run(
      "ffmpeg",
      ["-y", "-i", source_path, "-vn", "-c:a", "libmp3lame", "-b:a", "320k", "-f", "mp3", tmp_path],
      output: Process::Redirect::Close,
      error: Process::Redirect::Inherit
    )

    unless result.success?
      STDERR.puts "Transcoding failed for #{source_path}"
      File.delete(tmp_path) if File.exists?(tmp_path)
      return nil
    end

    File.rename(tmp_path, cache_path)
    cache_path
  end

  private def serve_direct(http_context, abs_path : String, ext : String)
    content_type = MIME_TYPES[ext]? || "application/octet-stream"
    file_size = File.size(abs_path)
    range_header = http_context.request.headers["Range"]?

    if range_header
      if range_header =~ /bytes=(\d*)-(\d*)/
        range_start = $1.empty? ? 0_i64 : $1.to_i64
        range_end = $2.empty? ? file_size - 1 : $2.to_i64
        range_end = file_size - 1 if range_end >= file_size
        content_length = range_end - range_start + 1

        http_context.response.status_code = 206
        http_context.response.headers["Content-Type"] = content_type
        http_context.response.headers["Content-Range"] = "bytes #{range_start}-#{range_end}/#{file_size}"
        http_context.response.headers["Accept-Ranges"] = "bytes"
        http_context.response.headers["Content-Length"] = content_length.to_s

        stream_file(http_context.response, abs_path, range_start, content_length)
      else
        http_context.response.status_code = 416
        "Range Not Satisfiable"
      end
    else
      http_context.response.headers["Content-Type"] = content_type
      http_context.response.headers["Content-Length"] = file_size.to_s
      http_context.response.headers["Accept-Ranges"] = "bytes"

      stream_file(http_context.response, abs_path)
    end
  end
end

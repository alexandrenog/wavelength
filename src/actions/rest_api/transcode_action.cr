class TranscodeAction < TrackAction
  @[Post("/api/transcode/:id")]
  def start(http_context)
    track = find_track_or_404(http_context)
    unless track
      return %({"status":"error","message":"Track not found"})
    end

    cache_path = Scanner.cache_path_for(track.filename)

    if File.exists?(cache_path)
      return %({"status":"cached"})
    end

    abs_path = File.expand_path(File.join(AppConfig.music_path, track.filename))
    tmp_path = cache_path + ".tmp"

    id = http_context.params.url["id"]
    already = TranscodeService.running?(id)
    TranscodeService.start(id, abs_path, track.duration, cache_path, tmp_path)
    ProgressTracker.set(id, 0) unless already

    setContentType(http_context.response, Json)
    %({"status":"started"})
  end

  @[Get("/api/transcode/:id/progress")]
  def progress(http_context)
    id = http_context.params.url["id"]
    pct = ProgressTracker.get(id)
    setContentType(http_context.response, Json)
    %({"progress":#{pct}})
  end
end

class TrackAction < BaseAction
  def find_track_or_404(http_context) : Track?
    id = http_context.params.url["id"]
    track = Scanner.find_by_id(id)
    unless track
      http_context.response.status_code = 404
      return nil
    end
    track
  end

  def resolve_track_path(track : Track) : String?
    music_path = AppConfig.music_path
    abs_path = File.expand_path(File.join(music_path, track.filename))
    return nil unless abs_path.starts_with?(File.expand_path(music_path))
    return nil unless File.exists?(abs_path)
    abs_path
  end
end

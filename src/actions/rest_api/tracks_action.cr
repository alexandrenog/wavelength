class TracksAction < BaseAction
  @[Get("/api/tracks")]
  def list(http_context)
    setTypeJson(http_context)
    Scanner.tracks.to_json
  end
end

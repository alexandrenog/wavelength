class TracksAction < BaseAction
  @[Get("/api/tracks")]
  def list(http_context)
    setContentType(http_context.response, Json)
    Scanner.all_with_transcode_status.to_json
  end
end

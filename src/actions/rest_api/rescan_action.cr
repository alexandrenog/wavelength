class RescanAction < BaseAction
  @[Post("/api/rescan")]
  def rescan(http_context)
    Scanner.scan
    setTypeJson(http_context)
    {count: Scanner.tracks.size}.to_json
  end
end

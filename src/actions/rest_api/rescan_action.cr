class RescanAction < BaseAction
  @[Post("/api/rescan")]
  def rescan(http_context)
    Scanner.scan_music_directory
    setContentType(http_context.response, Json)
    {count: Scanner.all.size}.to_json
  end
end

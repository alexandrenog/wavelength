class StaticAction < BaseAction
  STATIC_DIR = "src/public"

  Kemal.config.public_folder = "/dev/null"

  @[Get("/*path")]
  def serve(http_context)
    path = http_context.params.url["path"]
    extension = File.extname(path).lstrip('.')
    if (type = ContentType.isExtensionAllowedForPublicAccess?(extension))
      full = File.join(STATIC_DIR, path)
      if File.exists?(full)
        setContentType(http_context.response, type)
        File.read(full)
      else
        http_context.response.status_code = 404
        "Not found"
      end
    else
      http_context.response.status_code = 404
      "Not found"
    end
  end
end

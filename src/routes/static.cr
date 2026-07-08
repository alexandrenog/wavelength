require "kemal"

STATIC_DIR = "src/public"
STATIC_EXTS = {"js" => "application/javascript", "css" => "text/css"}

# Disable Kemal's built-in static file handler — we handle it here
Kemal.config.public_folder = "/dev/null"

get "/*path" do |env|
  path = env.params.url["path"]
  ext = File.extname(path).lstrip('.')
  if (mime = STATIC_EXTS[ext]?)
    full = File.join(STATIC_DIR, path)
    if File.exists?(full)
      env.response.content_type = "#{mime}; charset=utf-8"
      File.read(full)
    else
      halt env, status_code: 404, response: "Not found"
    end
  else
    halt env, status_code: 404, response: "Not found"
  end
end

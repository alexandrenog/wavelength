require "kemal"
require "json"
require "yaml"
require "./config"
require "./scanner"

# Load config before routes (routes reference AppConfig / Scanner)
AppConfig.load("config/config.yml")
Scanner.start

# ── Routes ────────────────────────────────────────────────────────────────────
require "./routes/page"
require "./routes/api/tracks"
require "./routes/api/rescan"
require "./routes/api/audio"
require "./routes/static"

Kemal.run do |config|
  server = config.server.not_nil!
  server.bind_tcp "0.0.0.0", AppConfig.port
end

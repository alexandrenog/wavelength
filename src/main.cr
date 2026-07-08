require "kemal"
require "./configuration/**"
require "./classes/**"

# Load config before routes (routes reference AppConfig / Scanner)
AppConfig.load("config/config.yml")
Scanner.start

# ── Actions ────────────────────────────────────────────────────────────────────
require "./actions/base/base_action"
require "./actions/**"

# ── Register all action routes ────────────────────────────────────────────────
register_actions

Kemal.config.logging = false

Kemal.run do |config|
  server = config.server.not_nil!
  server.bind_tcp AppConfig.host, AppConfig.port
end

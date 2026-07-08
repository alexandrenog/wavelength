require "kemal"
require "json"
require "yaml"
require "./config"
require "./scanner"
require "./routes"

# Load config
AppConfig.load("config/config.yml")

# Start background scanner
Scanner.start

Kemal.run do |config|
  server = config.server.not_nil!
  server.bind_tcp "0.0.0.0", AppConfig.port
end

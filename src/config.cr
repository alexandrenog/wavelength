require "yaml"

module AppConfig
  extend self

  SUPPORTED_EXTENSIONS = {".mp3", ".wma", ".m4a", ".ogg", ".flac"}

  @@music_path : String = "/music"
  @@port : Int32 = 3000
  @@scan_interval : Int32 = 60

  def load(path : String)
    if File.exists?(path)
      data = YAML.parse(File.read(path))
      @@music_path = data["music_path"].as_s if data["music_path"]?
      @@port = data["port"].as_i if data["port"]?
      @@scan_interval = data["scan_interval"].as_i if data["scan_interval"]?
    else
      STDERR.puts "Config file not found at #{path}, using defaults."
    end
    puts "Music path: #{@@music_path}"
    puts "Port: #{@@port}"
    puts "Scan interval: #{@@scan_interval}s"
  end

  def music_path : String
    @@music_path
  end

  def port : Int32
    @@port
  end

  def scan_interval : Int32
    @@scan_interval
  end
end

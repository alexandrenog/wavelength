require "json"

struct Track
  include JSON::Serializable

  property id : String
  property title : String
  property artist : String
  property album : String
  property filename : String
  property ext : String
  property size : Int64

  def initialize(@id, @title, @artist, @album, @filename, @ext, @size)
  end
end

module Scanner
  extend self

  @@tracks : Array(Track) = [] of Track
  @@mutex = Mutex.new

  def tracks : Array(Track)
    @@mutex.synchronize { @@tracks.dup }
  end

  def find(id : String) : Track?
    @@mutex.synchronize { @@tracks.find { |t| t.id == id } }
  end

  def start
    scan
    spawn do
      loop do
        sleep AppConfig.scan_interval.seconds
        scan
      end
    end
  end

  def scan
    music_path = AppConfig.music_path
    unless Dir.exists?(music_path)
      STDERR.puts "Music directory does not exist: #{music_path}"
      return
    end

    new_tracks = [] of Track

    Dir.glob(File.join(music_path, "**", "*")) do |file_path|
      next unless File.file?(file_path)
      ext = File.extname(file_path).downcase
      next unless AppConfig::SUPPORTED_EXTENSIONS.includes?(ext)

      filename = File.basename(file_path)
      # Strip extension to get a display name
      base = File.basename(file_path, ext)

      # Try to parse "Artist - Title" or "Artist - Album - Title" patterns
      parts = base.split(" - ", limit: 3).map(&.strip)
      title, artist, album = case parts.size
      when 3 then {parts[2], parts[0], parts[1]}
      when 2 then {parts[1], parts[0], "Unknown Album"}
      else        {base, "Unknown Artist", "Unknown Album"}
      end

      size = File.size(file_path)
      # Use a stable hash as ID based on relative path
      rel = file_path.lchop(music_path).lchop("/")
      id = rel.gsub(/[^a-zA-Z0-9]/, "_")

      new_tracks << Track.new(
        id: id,
        title: title,
        artist: artist,
        album: album,
        filename: rel,
        ext: ext.lchop("."),
        size: size
      )
    end

    new_tracks.sort_by! { |t| "#{t.artist}#{t.album}#{t.title}".downcase }

    @@mutex.synchronize { @@tracks = new_tracks }
    puts "Scanned #{new_tracks.size} tracks."
  end
end

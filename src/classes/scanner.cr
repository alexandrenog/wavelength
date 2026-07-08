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
      base = File.basename(file_path, ext)
      size = File.size(file_path)

      rel = file_path.lchop(music_path).lchop("/")
      id = rel.gsub(/[^a-zA-Z0-9]/, "_")

      meta = read_metadata(file_path)

      # Parse filename as fallback
      parts = base.split(" - ", limit: 3).map(&.strip)
      f_title, f_artist, f_album = case parts.size
      when 3 then {parts[2], parts[0], parts[1]}
      when 2 then {parts[1], parts[0], "Unknown Album"}
      else        {base, "Unknown Artist", "Unknown Album"}
      end

      title = meta.try { |m| m[:title] }.presence || f_title
      artist = meta.try { |m| m[:artist] }.presence || f_artist
      album = meta.try { |m| m[:album] }.presence || f_album

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

  private def read_metadata(file_path : String) : NamedTuple(title: String?, artist: String?, album: String?)?
    begin
      stdout = IO::Memory.new
      result = Process.run(
        "ffprobe",
        ["-v", "quiet", "-print_format", "json", "-show_format", file_path],
        output: stdout
      )
      return nil unless result.success?
      stdout.rewind
      output = stdout.gets_to_end

      data = JSON.parse(output)
      tags = data.dig?("format", "tags")
      return nil unless tags

      title = guess_tag(tags, {"title", "TIT2", "©nam"})
      artist = guess_tag(tags, {"artist", "TPE1", "©ART"})
      album = guess_tag(tags, {"album", "TALB", "©alb"})

      # Return what we found — nil fields will be filled from filename
      {title: title, artist: artist, album: album}
    rescue
      nil
    end
  end

  private def guess_tag(tags : JSON::Any, keys : Enumerable(String)) : String?
    keys.each do |key|
      if (val = tags[key]?) && (s = val.to_s.strip; !s.empty?)
        return s
      end
    end
    nil
  end
end

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
  property codec : String
  property duration : Float64
  property needs_transcoding : Bool
  property transcoded : Bool

  def initialize(@id, @title, @artist, @album, @filename, @ext, @size, @codec = "aac", @duration = 0.0, @needs_transcoding = false, @transcoded = false)
  end
end

module Scanner
  extend self

  @@tracks : Array(Track) = [] of Track
  @@mutex = Mutex.new

  def all : Array(Track)
    @@mutex.synchronize { @@tracks.dup }
  end

  def all_with_transcode_status : Array(Track)
    @@mutex.synchronize do
      @@tracks.map do |t|
        next t unless t.needs_transcoding
        path = cache_path_for(t.filename)
        Track.new(id: t.id, title: t.title, artist: t.artist, album: t.album, filename: t.filename, ext: t.ext, size: t.size, codec: t.codec, duration: t.duration, needs_transcoding: t.needs_transcoding, transcoded: File.exists?(path))
      end
    end
  end

  def find_by_id(id : String) : Track?
    @@mutex.synchronize { @@tracks.find { |t| t.id == id } }
  end

  def start_periodic_scan
    scan_music_directory
    spawn do
      loop do
        sleep AppConfig.scan_interval.seconds
        scan_music_directory
      end
    end
  end

  def scan_music_directory
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

      meta = probe_metadata(file_path)

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

      codec = meta.try { |m| m[:codec] }.presence || "unknown"
      duration = meta.try { |m| m[:duration] } || 0.0
      needs_transcoding = AppConfig::UNSUPPORTED_CODECS.includes?(codec)
      transcoded = false
      if needs_transcoding
        path = cache_path_for(rel)
        transcoded = File.exists?(path)
      end

      new_tracks << Track.new(
        id: id,
        title: title,
        artist: artist,
        album: album,
        filename: rel,
        ext: ext.lchop("."),
        size: size,
        codec: codec,
        duration: duration,
        needs_transcoding: needs_transcoding,
        transcoded: transcoded
      )
    end

    new_tracks.sort_by! { |t| "#{t.artist}#{t.album}#{t.title}".downcase }

    @@mutex.synchronize { @@tracks = new_tracks }
    puts "Scanned #{new_tracks.size} tracks."
  end

  def cache_path_for(filename : String) : String
    cache_key = filename.gsub(/[^a-zA-Z0-9._-]/, "_")
    File.join(AppConfig::CACHE_DIR, "#{cache_key}.mp3")
  end

  private def probe_metadata(file_path : String) : NamedTuple(title: String?, artist: String?, album: String?, codec: String?, duration: Float64)?
    begin
      stdout = IO::Memory.new
      result = Process.run(
        "ffprobe",
        ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", file_path],
        output: stdout
      )
      return nil unless result.success?
      stdout.rewind
      output = stdout.gets_to_end

      data = JSON.parse(output)

      codec = data.dig?("streams")
        .try { |streams|
          streams.as_a.find { |s| s["codec_type"]?.try(&.as_s) == "audio" }
            .try { |s| s["codec_name"]?.try(&.as_s) }
        }

      duration = data.dig?("format", "duration").try(&.as_s).try(&.to_f) || 0.0

      tags = data.dig?("format", "tags")
      return nil unless tags

      title = find_first_tag(tags, {"title", "TIT2", "©nam"})
      artist = find_first_tag(tags, {"artist", "TPE1", "©ART"})
      album = find_first_tag(tags, {"album", "TALB", "©alb"})

      {title: title, artist: artist, album: album, codec: codec, duration: duration}
    rescue
      nil
    end
  end

  private def find_first_tag(tags : JSON::Any, keys : Enumerable(String)) : String?
    keys.each do |key|
      if (val = tags[key]?) && (s = val.to_s.strip; !s.empty?)
        return s
      end
    end
    nil
  end
end

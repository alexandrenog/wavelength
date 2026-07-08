require "kemal"
require "mime"

MIME_TYPES = {
  "mp3"  => "audio/mpeg",
  "wma"  => "audio/x-ms-wma",
  "m4a"  => "audio/mp4",
  "ogg"  => "audio/ogg",
  "flac" => "audio/flac",
}

get "/audio/:id" do |env|
  id = env.params.url["id"]
  track = Scanner.find(id)

  unless track
    env.response.status_code = 404
    next "Track not found"
  end

  music_path = AppConfig.music_path
  abs_path = File.expand_path(File.join(music_path, track.filename))

  unless abs_path.starts_with?(File.expand_path(music_path))
    env.response.status_code = 403
    next "Forbidden"
  end

  unless File.exists?(abs_path)
    env.response.status_code = 404
    next "File not found on disk"
  end

  content_type = MIME_TYPES[track.ext]? || "application/octet-stream"
  file_size = File.size(abs_path)
  range_header = env.request.headers["Range"]?

  if range_header
    if range_header =~ /bytes=(\d*)-(\d*)/
      range_start = $1.empty? ? 0_i64 : $1.to_i64
      range_end = $2.empty? ? file_size - 1 : $2.to_i64
      range_end = file_size - 1 if range_end >= file_size
      content_length = range_end - range_start + 1

      env.response.status_code = 206
      env.response.headers["Content-Type"] = content_type
      env.response.headers["Content-Range"] = "bytes #{range_start}-#{range_end}/#{file_size}"
      env.response.headers["Accept-Ranges"] = "bytes"
      env.response.headers["Content-Length"] = content_length.to_s

      File.open(abs_path, "rb") do |f|
        f.seek(range_start)
        buf = Bytes.new(65536)
        remaining = content_length
        while remaining > 0
          to_read = Math.min(buf.size.to_i64, remaining).to_i
          n = f.read(buf[0, to_read])
          break if n == 0
          env.response.write(buf[0, n])
          remaining -= n
        end
      end
    else
      env.response.status_code = 416
      "Range Not Satisfiable"
    end
  else
    env.response.headers["Content-Type"] = content_type
    env.response.headers["Content-Length"] = file_size.to_s
    env.response.headers["Accept-Ranges"] = "bytes"

    File.open(abs_path, "rb") do |f|
      buf = Bytes.new(65536)
      loop do
        n = f.read(buf)
        break if n == 0
        env.response.write(buf[0, n])
      end
    end
  end
end

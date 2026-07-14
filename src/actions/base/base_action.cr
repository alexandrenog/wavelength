require "kemal"

annotation Get
end

annotation Post
end

abstract class BaseAction
  Html = ContentType::Type::Html
  Json = ContentType::Type::Json
  Javascript = ContentType::Type::Javascript
  Css = ContentType::Type::Css

  def setContentType(response : HTTP::Server::Response, type : ContentType::Type)
    response.content_type = type.content_type_value
  end

  # Streams a file to the HTTP response.
  #
  # Reads from *path* starting at *offset* and sends up to *length* bytes.
  # If *length* is nil, streams until end of file.
  # Uses a 64KB buffer for efficient I/O.
  def stream_file(response : HTTP::Server::Response, path : String, offset : Int64 = 0, length : Int64? = nil)
    file_size = File.size(path)
    length ||= file_size - offset

    File.open(path, "rb") do |f|
      f.seek(offset)
      buf = Bytes.new(65536)
      remaining = length
      while remaining > 0
        to_read = Math.min(buf.size.to_i64, remaining).to_i
        n = f.read(buf[0, to_read])
        break if n == 0
        response.write(buf[0, n])
        remaining -= n
      end
    end
  end
end

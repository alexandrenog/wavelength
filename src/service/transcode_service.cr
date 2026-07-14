module TranscodeService
  @@running = {} of String => Process
  @@running_mutex = Mutex.new
  @@semaphore : Channel(Nil)?

  def self.semaphore : Channel(Nil)
    @@semaphore ||= begin
      ch = Channel(Nil).new(3)
      3.times { ch.send(nil) }
      ch
    end
  end

  def self.running?(id : String) : Bool
    @@running_mutex.synchronize { @@running.has_key?(id) }
  end

  def self.active_ids : Array(String)
    @@running_mutex.synchronize { @@running.keys }
  end

  def self.start(id : String, abs_path : String, duration : Float64, cache_path : String, tmp_path : String)
    return if running?(id)

    expected_size = (duration * 40000).to_i64

    spawn do
      Dir.mkdir_p(AppConfig::CACHE_DIR)

      semaphore.receive

      process = uninitialized Process
      @@running_mutex.synchronize do
        if old = @@running.delete(id)
          old.signal(:term)
        end
        process = Process.new(
          "ffmpeg",
          ["-y", "-i", abs_path, "-vn", "-c:a", "libmp3lame", "-b:a", "320k", "-f", "mp3", tmp_path],
          output: Process::Redirect::Close,
          error: Process::Redirect::Inherit
        )
        @@running[id] = process
      end

      done_ch = Channel(Process::Status).new
      spawn { done_ch.send(process.wait) }

      status = uninitialized Process::Status
      aborted = false

      loop do
        select
        when st = done_ch.receive
          status = st
          break
        else
          @@running_mutex.synchronize { aborted = true unless @@running[id] == process }
          break if aborted

          if expected_size > 0 && File.exists?(tmp_path)
            cur = File.size(tmp_path)
            pct = ((cur * 100) / expected_size).to_i
            ProgressTracker.set(id, Math.min(pct, 99))
          end
          sleep 0.3
        end
      end

      if aborted
        process.wait
        semaphore.send(nil)
        next
      end

      @@running_mutex.synchronize do
        if @@running[id] == process
          @@running.delete(id)
          if status.exit_code == 0
            File.rename(tmp_path, cache_path)
            ProgressTracker.set(id, 100)
          else
            File.delete(tmp_path) if File.exists?(tmp_path)
            ProgressTracker.set(id, 0)
          end
        end
      end

      semaphore.send(nil)
    end
  end
end

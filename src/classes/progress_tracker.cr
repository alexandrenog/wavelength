module ProgressTracker
  @@progress = {} of String => Int32
  @@mutex = Mutex.new

  def self.get(id : String) : Int32
    @@mutex.synchronize { @@progress[id]? || 0 }
  end

  def self.set(id : String, pct : Int32)
    @@mutex.synchronize { @@progress[id] = pct }
  end
end

require "kemal"

post "/api/rescan" do |env|
  Scanner.scan
  env.response.content_type = "application/json"
  {count: Scanner.tracks.size}.to_json
end

require "kemal"

get "/api/tracks" do |env|
  env.response.content_type = "application/json"
  Scanner.tracks.to_json
end

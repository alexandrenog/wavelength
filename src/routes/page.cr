require "kemal"

get "/" do |env|
  env.response.content_type = "text/html; charset=utf-8"
  render "src/views/index.ecr"
end

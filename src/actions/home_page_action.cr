class HomePageAction < BaseAction
  @[Get("/")]
  def index(http_context)
    setContentType(http_context.response, Html)
    render "src/views/home_page.ecr"
  end
end

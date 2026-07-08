class HomePageAction < BaseAction
  @[Get("/")]
  def index(http_context)
    setTypeHtml(http_context)
    render "src/views/home_page.ecr"
  end
end

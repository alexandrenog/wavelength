require "kemal"

annotation Get
end

annotation Post
end

abstract class BaseAction
  def setTypeHtml(http_context)
    http_context.response.content_type = ContentType::Type::Html.content_type_value
  end

  def setTypeJson(http_context)
    http_context.response.content_type = ContentType::Type::Json.content_type_value
  end

  def setTypeJavascript(http_context)
    http_context.response.content_type = ContentType::Type::Javascript.content_type_value
  end

  def setTypeCss(http_context)
    http_context.response.content_type = ContentType::Type::Css.content_type_value
  end

  def setContentType(http_context, type : ContentType::Type)
    http_context.response.content_type = type.content_type_value
  end
end

module ContentType
  enum Type
    Html
    Json
    Javascript
    Css

    def content_type_value : String
      case self
      in Html        then "text/html; charset=utf-8"
      in Json        then "application/json"
      in Javascript  then "application/javascript; charset=utf-8"
      in Css         then "text/css; charset=utf-8"
      end
    end
  end

  SERVED_STATIC_FILE_EXTENSIONS = {
    "js"  => Type::Javascript,
    "css" => Type::Css,
  }

  def self.isExtensionAllowedForPublicAccess?(extension : String) : Type?
    SERVED_STATIC_FILE_EXTENSIONS[extension]?
  end
end
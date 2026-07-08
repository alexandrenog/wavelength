macro register_actions
  \{% for type in BaseAction.all_subclasses %}
    \{% for method in type.methods %}
      \{% if ann = method.annotation(Get) %}
        get \{{ann.args[0]}} do |http_context|
          \{{type}}.new.\{{method.name}}(http_context)
        end
      \{% elsif ann = method.annotation(Post) %}
        post \{{ann.args[0]}} do |http_context|
          \{{type}}.new.\{{method.name}}(http_context)
        end
      \{% end %}
    \{% end %}
  \{% end %}
end

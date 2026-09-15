'use strict';

// Rewrite standard ```mermaid fenced code blocks into NexT's
// {% mermaid %} tag syntax, so posts can use the common GitHub-style
// ```mermaid fence and still render as a diagram.
hexo.extend.filter.register('before_post_render', function(data) {
  data.content = data.content.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_, body) => `{% mermaid %}\n${body}{% endmermaid %}`
  );
  return data;
}, 5);

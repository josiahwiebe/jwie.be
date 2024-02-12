<?php
function get_all_posts($dir = 'blog') {
  $posts = glob(__DIR__ . '/../content/' . $dir . '/*.md');
  $posts = array_reverse($posts);
  $posts = array_map(
    function ($post) use ($dir) {
      if ($post == __DIR__ . '/../content/' . $dir . '/index.md') return;
      $path = str_replace(__DIR__ . '/../content', '', $post);
      $path = str_replace('.md', '', $path);
      $file = load_markdown($path);
      if (!$file->content) return;
      $document = parse_markdown($file->content, $file->slug);
      if (isset($document->front_matter->published) && $document->front_matter->published == false) return;
      return $document;
    },
    $posts
  );
  $posts = array_filter($posts);
  return $posts;
}

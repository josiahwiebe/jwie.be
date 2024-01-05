<?php
function get_all_posts() {
  $posts = glob(__DIR__ . '/../content/blog/*.md');
  $posts = array_reverse($posts);
  $posts = array_map(
    function ($post) {
      if ($post == __DIR__ . '/../content/blog/index.md') return;
      $path = str_replace(__DIR__ . '/../content', '', $post);
      $path = str_replace('.md', '', $path);
      $file = load_markdown($path);
      $document = parse_markdown($file->content, $file->slug);
      return $document;
    },
    $posts
  );
  $posts = array_filter($posts);
  return $posts;
}

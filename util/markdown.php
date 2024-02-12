<?php

use Spatie\YamlFrontMatter\YamlFrontMatter;

class ParsedownHighlighting extends Parsedown {

  protected function blockFencedCodeComplete($block) {
    $text = $block['element']['text']['text'];
    $language = $block['element']['text']['attributes']['class'];

    $language = explode('-', $language)[1];

    $hl = new \Highlight\Highlighter();
    $highlighted = $hl->highlight($language, $text);

    unset($block['element']['text']['text']);
    $block['element']['text']['attributes']['class'] = 'hljs ' . $highlighted->language;
    $block['element']['text']['rawHtml'] = $highlighted->value;

    return $block;
  }
}

function parse_markdown($file_contents, $slug) {
  if (!is_string($file_contents)) {
    return 'Invalid file contents';
  }
  $object = YamlFrontMatter::parse($file_contents);
  if ($object->matter()) {

    $parsed_markdown = (new ParsedownHighlighting)->text($object->body() ?? "");

    return (object) [
      'markdown' => $parsed_markdown,
      'front_matter' => (object) $object->matter(),
      'slug' => $slug,
    ];
  } else {
    return (object) [
      'markdown' => null,
      'front_matter' => null,
      'slug' => $slug,
    ];
  }
}

function get_file_path($file_path) {
  $markdownFilePath = MARKDOWN_BASE_DIR . rtrim($file_path, '/');

  $slug = str_replace(MARKDOWN_BASE_DIR, '', $markdownFilePath);
  $slug = str_replace('.md', '', $slug);

  // Check if the requested path is a directory
  if (is_dir($markdownFilePath)) {
    // If it's a directory, append 'index.md' to the file lookup
    $markdownFilePath .= '/index.md';
  } else {
    // If it's not a directory, simply add '.md' to the file
    $markdownFilePath .= '.md';
  }
  return (object) ["path" => $markdownFilePath, "slug" => $slug];
}

function load_markdown($path) {
  $markdownFilePath = get_file_path($path);

  // Check if the Markdown file exists
  if (file_exists($markdownFilePath->path)) {
    // Load and display the content of the Markdown file
    $markdownContent = file_get_contents($markdownFilePath->path);
    return (object) ["content" => $markdownContent, "slug" => $markdownFilePath->slug];
  } else {
    // Display an error message if the Markdown file is not found
    return (object) ["content" => null, "slug" => $markdownFilePath->slug];
  }
}

<?php

use Spatie\YamlFrontMatter\YamlFrontMatter;

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\Attributes\AttributesExtension;
use League\CommonMark\Extension\ExternalLink\ExternalLinkExtension;
use League\CommonMark\Extension\CommonMark\Node\Block\FencedCode;
use League\CommonMark\Extension\CommonMark\Node\Block\IndentedCode;
use League\CommonMark\MarkdownConverter;
use JSW\Figure\FigureExtension;
use JSW\Container\ContainerExtension;
use Spatie\CommonMarkHighlighter\FencedCodeRenderer;
use Spatie\CommonMarkHighlighter\IndentedCodeRenderer;

$config = [
  'external_link' => [
    'internal_hosts' => ['localhost', 'jwie.be'],
    'open_in_new_window' => true,
    'html_class' => 'external-link',
    'nofollow' => '',
    'noopener' => 'external',
    'noreferrer' => 'external',
  ],
];

$environment = new Environment($config);
$environment->addExtension(new CommonMarkCoreExtension());
$environment->addExtension(new GithubFlavoredMarkdownExtension());
$environment->addExtension(new AttributesExtension());
$environment->addExtension(new ExternalLinkExtension());
$environment->addExtension(new FigureExtension());
$environment->addExtension(new ContainerExtension());
$environment->addRenderer(FencedCode::class, new FencedCodeRenderer());
$environment->addRenderer(IndentedCode::class, new IndentedCodeRenderer());
$markdownConverter = new MarkdownConverter($environment);

function parse_markdown($file_contents, $slug) {
  global $markdownConverter;
  if (!is_string($file_contents)) {
    return 'Invalid file contents';
  }
  $object = YamlFrontMatter::parse($file_contents);
  if ($object->matter()) {

    $parsed_markdown = $markdownConverter->convert($object->body() ?? "");

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
  $uri = explode('?', $path)[0];
  $markdownFilePath = get_file_path($uri);

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

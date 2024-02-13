 <?php

  if (!isset($_ENV['VERCEL'])) {
    if (preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/', $_SERVER['REQUEST_URI'])) {
      require(__DIR__ . '/../util/dev.php');
      dev_load_static_files($_SERVER['REQUEST_URI']);
      return;
    }
  }

  require_once __DIR__ . '/../vendor/autoload.php';
  $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
  $dotenv->safeLoad();

  define('MARKDOWN_BASE_DIR', $_ENV['VERCEL']  ? '/var/task/user/content' : __DIR__ . '/../content');

  require(__DIR__ . '/../util/markdown.php');
  require(__DIR__ . '/../util/posts.php');

  $file = load_markdown($_SERVER['REQUEST_URI']);
  $document = parse_markdown($file->content, $file->slug);

  // if the markdown file doesn't have front matter, 404

  if (!isset($document->front_matter)) {
    http_response_code(404);
    $template_name = '404';
    include(__DIR__ . '/../templates/base.php');
    exit;
  }

  // if the markdown file has front matter, render it
  $content = $document->markdown;

  $template_name = $document->front_matter->layout ?? 'post';

  include(__DIR__ . '/../templates/base.php');

  exit;

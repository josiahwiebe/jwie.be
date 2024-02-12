<?php
$title = ($_SERVER['REQUEST_URI'] == '/' || !isset($document->front_matter->title))
  ? 'Josiah Wiebe'
  : 'Josiah Wiebe – ' . $document->front_matter->title;

$uri_segment = explode('/', $_SERVER['REQUEST_URI'])[1];
$uri_segment = $uri_segment == '' ? null : '/' . $uri_segment;
$nav_items = [
  ['name' => 'Blog', 'slug' => '/blog'],
  ['name' => 'Logbook', 'slug' => '/logbook'],
  ['name' => 'Not here', 'slug' => '/online'],
]
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $title; ?></title>
  <link rel="stylesheet" href="/css/fonts.css" />
  <link rel="stylesheet" href="/css/style.css" />
</head>

<body>
  <header class="grid-row site-header">
    <h1 class="site-title">
      <a href="/" class='text-black dark:text-slate-300 no-underline'>
        JWWW
      </a>
    </h1>
    <nav class="site-nav">
      <ul class="flex flex-row gap-4 list-none">
        <?php foreach ($nav_items as $nav_item) : ?>
          <li><a class="<?= $uri_segment && str_starts_with($nav_item['slug'], $uri_segment) ? 'is-active' : '' ?>" href="<?= $nav_item['slug']; ?>"><?= $nav_item['name']; ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>
  </header>
  <main class="grid-row site-content">
    <?php include(__DIR__ . '/' . $template_name . '.php'); ?>
  </main>
  <footer class='grid-row'>
    <div class='footer-content'>
      <div class='text-xs text-gray-500 leading-5 mt-4 space-x-3 flex items-center'>
        <a href='/feed.xml' class='text-gray-500 dark:text-slate-400 no-underline hover:no-underline'>
          RSS
        </a>
        <a href='/feed.json' class='text-gray-500 dark:text-slate-400 no-underline hover:no-underline'>
          JSON
        </a>
        <a href='/archive' class='text-gray-500 dark:text-slate-400 no-underline hover:no-underline'>
          Archive
        </a>
        <span class='w-full h-1 mt-1 inline-flex border-t border-gray-200 dark:border-slate-700'></span>
        <a href='https://twitter.com/josiahwiebe' class='text-gray-500 dark:text-slate-400 no-underline hover:no-underline'>
          Twitter
        </a>
        <a href='https://mastodon.social/@josiahwiebe' class='text-gray-500 dark:text-slate-400 no-underline hover:no-underline'>
          Mastodon
        </a>
        <a href='https://instagram.com/josiahwiebe' class='text-gray-500 dark:text-slate-400 no-underline hover:no-underline'>
          Instagram
        </a>
      </div>
      <span class='text-xs text-gray-500 dark:text-slate-400 leading-5 block mt-4'>
        &copy; 2011—<?= date('Y'); ?>
      </span>
    </div>
  </footer>
</body>

<script>
  window.va = window.va || function() {
    (window.vaq = window.vaq || []).push(arguments);
  };
</script>
<script defer src="/_vercel/insights/script.js"></script>

</html>
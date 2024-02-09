<?php
$title = ($_SERVER['REQUEST_URI'] == '/' && null !== $document->front_matter->title)
  ? 'php-md – ' . $document->front_matter->title
  : 'php-md';
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $title; ?></title>
  <link rel="stylesheet" href="/css/style.css" />
</head>

<body>
  <header class="grid-row site-header">
    <h1 class="site-title"><a href="/">php-md</a></h1>
    <nav class="site-nav">
      <ul>
        <li><a href="/blog">Blog</a></li>
      </ul>
    </nav>
  </header>
  <main class="grid-row site-content">
    <?php include(__DIR__ . '/' . $template_name . '.php'); ?>
  </main>
  <footer class="grid-row">
    <div class="footer-content">

    </div>
  </footer>
</body>

</html>
<?php
$posts = get_all_posts();

?>

<header class='page-header'>
  <h1>Blog</h1>
</header>

<section class='page-content'>
  <?php foreach ($posts as $post) : ?>
    <article>
      <div>
        <a href="/blog/<?= $post->front_matter->slug; ?>">
          <h2><?= $post->front_matter->title; ?></h2>
        </a>
        <?php echo date('F j, Y', $post->front_matter->date); ?>
      </div>
    </article>
  <?php endforeach; ?>
</section>
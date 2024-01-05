<?php ?>

<header class='page-header'>
  <h1><?= $document->front_matter->title; ?></h1>
  <?php if (isset($document->front_matter->date)) : ?>
    <datetime><?= date('F j, Y', $document->front_matter->date); ?></datetime>
  <?php endif; ?>
</header>

<article class='page-content'>
  <div class='prose'>
    <?php echo $content; ?>
  </div>
</article>
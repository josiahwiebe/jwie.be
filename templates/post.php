<?php ?>

<header class='page-header blah'>
  <h1 class='text-2xl font-heading font-bold dark:text-slate-300'><?= $document->front_matter->title; ?></h1>
  <?php if (isset($document->front_matter->date)) : ?><datetime class='text-slate-700 dark:text-slate-600 text-md'><?php echo date('F j, Y', $document->front_matter->date); ?></datetime><?php endif; ?>
  <?php if (isset($document->front_matter->subtitle)) : ?><p class='text-slate-700 italic dark:text-slate-600 text-md'><?= $document->front_matter->subtitle; ?></p><?php endif; ?>
</header>

<article class='page-content'>
  <div class='prose'>
    <?php echo $content; ?>
  </div>
</article>
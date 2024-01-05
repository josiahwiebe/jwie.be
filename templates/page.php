<?php ?>

<section class='page-content grid items-center'>
  <div class='flex flex-col gap-4'>
    <h1 class='text-2xl font-heading font-bold sm:text-3xl md:text-4xl dark:text-slate-300'>
      <?= $document->front_matter->title; ?>
    </h1>
    <p class='text-gray-500 dark:text-slate-300 lg:text-lg'>
      <?php echo $content; ?>
    </p>
  </div>
</section>
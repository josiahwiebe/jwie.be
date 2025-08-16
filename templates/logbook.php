<?php
$posts = get_all_posts('logbook');
?>

<header class='page-header'>
  <h1 class='text-2xl font-heading font-bold dark:text-slate-300'>Logbook</h1>
  <?php if (isset($document->front_matter->subtitle)) : ?><p class='text-slate-700 dark:text-slate-600 text-md'><?= $document->front_matter->subtitle; ?></p><?php endif; ?>
</header>

<section class='page-content'>
  <?php foreach ($posts as $post) : ?>
    <article key={post.slug} class='flex flex-col space-y-4'>
      <div class='flex flex-col space-y-2'>
        <h2 class='max-w-[80%] text-2xl font-heading font-bold leading-normal sm:text-3xl md:text-3xl'>
          <a href="<?= $post->slug; ?>">
            <?= $post->front_matter->title; ?>
          </a>
        </h2>
        <datetime class='text-sm text-slate-600'><?php echo date('F j, Y', strtotime($post->front_matter->date)); ?></datetime>
      </div>
      <?php if (isset($post->front_matter->excerpt)) : ?><p class='text-slate-600 dark:text-slate-400'><?= $post->front_matter->excerpt; ?></p><?php endif; ?>
      <div class='py-8 md:py-10 lg:py-12'>
        <hr class='border-slate-100 dark:border-slate-700' />
      </div>
    </article>
  <?php endforeach; ?>
</section>
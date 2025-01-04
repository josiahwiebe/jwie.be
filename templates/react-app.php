<?php $isDev = !isset($_ENV['VERCEL']) || $_ENV['VERCEL'] !== 'true'; ?>
<?php
$assets = vite_assets();
?>

<header class='page-header react-app'>
  <h1 class='text-2xl font-heading font-bold dark:text-slate-300'><?= $document->front_matter->title; ?></h1>
  <?php if (isset($document->front_matter->subtitle)) : ?><p class='text-slate-700 dark:text-slate-600 text-md'><?= $document->front_matter->subtitle; ?></p><?php endif; ?>
</header>

<article class='page-content'>
  <div class='prose mb-12 max-w-none'>
    <?php echo $content; ?>
  </div>
  <div id='root'></div>
</article>

<?php if ($isDev): ?>
  <script type="module">
    import RefreshRuntime from 'http://localhost:5173/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>

  <script type="module" src="http://localhost:5173/@vite/client"></script>
  <script type="module" src="http://localhost:5173/src/lastfm/index.tsx"></script>
<?php else: ?>
  <script type="module" src="<?= $assets['js'] ?>"></script>
<?php endif; ?>
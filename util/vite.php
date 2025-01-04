<?php

function vite_assets() {
  $isDev = !isset($_ENV['VERCEL']) || $_ENV['VERCEL'] !== '1';

  if ($isDev) {
    return [
      'css' => 'http://localhost:5173/src/style.css',
      'js' => 'http://localhost:5173/src/lastfm/index.tsx'
    ];
  }

  $manifest = json_decode(file_get_contents(__DIR__ . '/../dist/.vite/manifest.json'), true);

  return [
    'css' => '/dist/' . $manifest['src/style.css']['file'],
    'js' => '/dist/' . $manifest['src/lastfm/index.tsx']['file']
  ];
}

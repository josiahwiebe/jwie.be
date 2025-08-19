---
title: Adding a Vite-Powered Playground to my Website
slug: adding-a-react-playground
date: '2025-01-04T00:00:00.000Z'
updated: '2025-08-19T03:11:10.000Z'
excerpt: >-
  You can easily use Vite to power a React/Solid/Vue/etc. application within
  your PHP website.
published: true
---
I was playing around with a React project locally and I wanted a way to share it within the context of my own website.

In this particular case, I'm configuring React, but you could use Vite to configure any other frontend framework.

This website has a bit of an unconventional setup, so I thought I'd share how I added a React application within the site. The concepts in this article could be applied to most PHP-based websites, where you handle the routing and rendering of the page on the server side.

First, we'll need [Vite](https://vite.dev/). I was already using TailwindCSS on the project, but using the Tailwind CLI, so let's replace that with Vite. We'll also use the [new Tailwind v4 beta](https://tailwindcss.com/docs/v4-beta). Let's install these new dependencies.

```bash
npm i vite tailwindcss@next @tailwindcss/vite@next
```

We'll need to create a `vite.config.ts` file in the root of the project to handle the build process.

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // we'll need the manifest so that we can load the assets into the PHP template
    manifest: true,
    rollupOptions: {
      input: {
        // handle the styles for the whole website
        style: resolve(__dirname, 'src/style.css'),
        // handle the styles for the playground
        playground: resolve(__dirname, 'src/playground/index.tsx'),
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  server: {
    origin: 'http://localhost:5173',
  },
})
```

Vite's [documentation for this](https://vite.dev/guide/backend-integration.html) is very good, but I just thought I'd get into a specific PHP example.

I'm going to assume you already have a React application created. Put that application in the `src/playground` directory, where `index.tsx` is the entry point for the application. If you're moving an existing application into this project, you'll need to update the `index.tsx` file with the module preload polyfill.

```ts
import 'vite/modulepreload-polyfill'

// ...existing react application code
```

We're going to create a PHP function that loads the Vite server and returns the HTML for the application in development mode.

```php
<?php

function dev_load_vite_module($path) {
  $vite_host = 'http://localhost:5173';
  $response = @file_get_contents($vite_host . $path);

  if ($response === false) {
    http_response_code(404);
    return;
  }

  if (str_contains($path, '.css')) {
    header('Content-Type: text/css');
  } else {
    header('Content-Type: application/javascript');
  }

  foreach ($http_response_header as $header) {
    if (str_contains(strtolower($header), 'access-control-')) {
      header($header);
    }
  }

  echo $response;
}
```

Hook this function into our router, perhaps with something like this:

```php
<?php

if (isset($_ENV['DEV'])) {
  dev_load_vite_module($_SERVER['REQUEST_URI']);
}

// ...existing template code
```

This will load the Vite server and return the HTML for the application in development mode.

Now we'll need to create a function to handle the assets in production mode.

```php
<?php

function vite_assets() {
  $isDev = isset($_ENV['DEV']);

  if ($isDev) {
    return [
      'css' => 'http://localhost:5173/src/style.css',
      'js' => 'http://localhost:5173/src/playground/index.tsx'
    ];
  }

  $manifest = json_decode(file_get_contents(__DIR__ . '/../dist/.vite/manifest.json'), true);

  return [
    'css' => '/dist/' . $manifest['src/style.css']['file'],
    'js' => '/dist/' . $manifest['src/playground/index.tsx']['file']
  ];
}
```

Update your root template to include the Vite assets in the `<head>` tag. You'll also need to add a root element for the React application to mount into.

```html
<?php $assets = vite_assets(); ?>
<head>
  <?php $isDev = isset($_ENV['DEV']); ?>
  <?php if ($isDev): ?>
  <script type="module" src="http://localhost:5173/@vite/client"></script>
  <?php endif; ?>
  <link rel="stylesheet" href="<?= $assets['css'] ?>" />
</head>
<body>
  <div id="root"></div>
  <?php if ($isDev): ?>
  <!-- since it's a react application, we need to load the react refresh runtime for development. -->
  <script type="module">
    import RefreshRuntime from 'http://localhost:5173/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>

  <script type="module" src="http://localhost:5173/@vite/client"></script>
  <script type="module" src="http://localhost:5173/src/playground/index.tsx"></script>
  <?php else: ?>
  <script type="module" src="<?= $assets['js'] ?>"></script>
  <?php endif; ?>
</body>
```

Since TailwindCSS v4 uses CSS for configuration, you'll want to update your root `src/style.css` file to use the new directives. You'll also want to add the `@source` directive to include the PHP files and the React application files.

```css
@import 'tailwindcss';

@source '../**/*.php';
@source './playground/**/*.tsx';
```

Now, simply update your `package.json` to use Vite.

```json
"scripts": {
  "dev": "vite",
  "build": "vite build"
}
```

Now you can run `npm run dev` to start the Vite server and `npm run build` to build the application. You should see the playground running on your site.

That's it! You can see my React application in action here: [Last.fm Listening Stats](/playground/lastfm)

The great thing about using Vite is that you could easily swap out the React application for another frontend framework. For example, you could use Solid or Vue instead of React and the same setup would work.

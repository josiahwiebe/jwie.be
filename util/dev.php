<?php
function dev_load_static_files($path) {
  dev_load_vite_module($path);
  http_response_code(200);
  $filename =  rtrim($path, '/');
  $file = file_get_contents(__DIR__ . '/../public/' . $filename);
  // get content type
  $extension = pathinfo($filename, PATHINFO_EXTENSION);
  $type = 'text/plain';
  switch ($extension) {
    case 'css':
      $type = 'text/css';
      break;
    case 'js':
      $type = 'application/javascript';
      break;
    case 'png':
      $type = 'image/png';
      break;
    case 'jpg':
      $type = 'image/jpeg';
      break;
    case 'jpeg':
      $type = 'image/jpeg';
      break;
    case 'gif':
      $type = 'image/gif';
      break;
    case 'svg':
      $type = 'image/svg+xml';
      break;
    case 'ico':
      $type = 'image/x-icon';
      break;
    case 'woff':
      $type = 'font/woff';
      break;
    case 'woff2':
      $type = 'font/woff2';
      break;
    default:
      $type = 'text/plain';
      break;
  }
  // set the header

  header('Content-Type: ' . $type);
  echo $file;
}

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

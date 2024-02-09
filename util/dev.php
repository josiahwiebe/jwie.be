<?php
function dev_load_static_files($path) {
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
    default:
      $type = 'text/plain';
      break;
  }
  // set the header

  header('Content-Type: ' . $type);
  echo $file;
}

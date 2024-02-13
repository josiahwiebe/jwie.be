<?php
require_once __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

define('MARKDOWN_BASE_DIR', $_ENV['VERCEL']  ? '/var/task/user/content' : __DIR__ . '/../content');

require(__DIR__ . '/../util/markdown.php');
require(__DIR__ . '/../util/posts.php');

require(__DIR__ . '/../util/feed.php');
exit;

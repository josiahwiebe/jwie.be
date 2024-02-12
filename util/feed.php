<?php
date_default_timezone_set('America/Winnipeg');
error_reporting(E_ALL ^ E_DEPRECATED);

use Lukaswhite\FeedWriter\RSS2;

$feed = new RSS2();
$channel = $feed->addChannel();
$channel->title('Josiah Wiebe - Blog')
  ->link('https://jwie.be/blog')
  ->description('Feed of blog posts from jwie.be')
  ->link('https://jwie.be/feed.xml')
  ->pubDate(new DateTime())
  ->lastBuildDate(new DateTime())
  ->copyright('2011–' . date('Y') . ' Josiah Wiebe')
  ->language('en-CA');

$posts = get_all_posts('blog');
foreach ($posts as $post) {
  $item = $channel->addItem()
    ->title($post->front_matter->title)
    ->link('https://jwie.be' . $post->slug)
    ->pubDate(new DateTime('@' . $post->front_matter->date))
    ->encodedContent($post->markdown)
    ->guid('https://jwie.be' . $post->slug, true);
}

header('Content-Type: ' . $feed->getMimeType());
$feed->prettyPrint();
print $feed;

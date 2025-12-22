<?php
date_default_timezone_set('America/Winnipeg');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING);

use Lukaswhite\FeedWriter\RSS2;

$feed = new RSS2('utf-8');
$feed->registerAtomNamespace()
  ->registerNamespace('dc', 'http://purl.org/dc/elements/1.1/')
  ->registerNamespace('content', 'http://purl.org/rss/1.0/modules/content/');
$channel = $feed->addChannel();
$channel->title('Josiah Wiebe – Blog')
  ->link('https://jwww.me/blog')
  ->addAtomLink('https://jwww.me/feed.xml', 'self')
  ->description('Feed of blog posts from jwww.me')
  ->link('https://jwww.me/feed.xml')
  ->pubDate(new DateTime())
  ->lastBuildDate(new DateTime())
  ->copyright('2011-' . date('Y') . ' Josiah Wiebe')
  ->language('en-CA');

$blog_posts = get_all_posts('blog');
$logbook_posts = get_all_posts('logbook');
$archive_posts = get_all_posts('archive');
$posts = array_merge($blog_posts, $logbook_posts, $archive_posts);
foreach ($posts as $post) {
  $item = $channel->addItem()
    ->title($post->front_matter->title)
    ->link('https://jwww.me' . $post->slug)
    ->pubDate(new DateTime($post->front_matter->date))
    ->encodedContent($post->markdown)
    ->guid('https://jwww.me' . $post->slug, true);
}

header('Content-Type: ' . $feed->getMimeType());
$feed->prettyPrint();
print $feed;

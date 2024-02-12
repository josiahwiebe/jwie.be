---
title: Building The Newsprint
date: 2014-12-02
---

This past week, Josh approached me about re-building his site, [The Newsprint](https://thenewsprint.co).
We've kind of been in an ongoing discussing since he [started](https://thenewsprint.co/2013/12/14/the-newsprint-an-introduction/) the column a year ago. He's asked for various advice and I've given it as best as I can.

If you've been following The Newsprint, you'll have noticed how much Josh likes to tinker with his site. In the short span of a year, he's gone from Squarespace to Ghost; updated the typography countless times, and tested numerous new layouts. I can still recall when [cloud.typography](https://typography.com/cloud) was released, and him drooling over the excellent Hoefler & Co typefaces — Ideal Sans in particular.
Regardless of the piece of advice that I was giving, there was always one little thing that came up that was limited by the system that Josh was currently using. As a result, Josh often voiced his desire for me to build him a custom site, eventually.

As the first year anniversary of the site was coming up, Josh thought it would be good timing to rebuild the site. He sent me a text telling me that he was looking into it and wasn't sure if I'd be able to do it for him, based on timeline. Immediately after receiving that text, I decided to do a quick mockup in Sketch, pretty much just for the fun of it. He had talked often of the style of site that he enjoyed, so I based the mockup off of those discussions.

<Image src='/img/building-the-newsprint/the-newsprint-screenshot.png' alt='Screenshot of The Newsprint' />

I sent it over to him, and he immediately thought that it was almost exactly how he had imagined it in his mind. It's pretty awesome when your design can align so well with client expectations so quickly. I spent a bit of time tweaking things; refining the main brand colour, tweaking the typography, and cleaning up the layout.

I decided that the mockup was close to what I was looking for, so I jumped into Sublime Text to start building. This is the first site that I've built with [Jekyll](https://jekyllrb.com), but I'm already very familiar with the [Liquid](https://liquidmarkup.org) syntax because at [Collectif](https://clc.tf) we've primarily been using the fantastic [Siteleaf](https://siteleaf.com) CMS.

The first thing that I had to do was get the content over from Josh's existing Ghost instance. I exported the Ghost data in JSON format from Ghost's debug menu. I used the excellent [jekyll_ghost_importer](http://rubygems.org/gems/jekyll_ghost_importer) gem to convert the posts from JSON to individual Markdown files. This process went very smoothly.

With all of the posts imported, I still needed to ensure they displayed properly. One of Josh's biggest complaints about previous CMS limitations was their support for proper link posts. I decided to start with this. I merely created a link layout, then added the necessary YAML headers to link posts:

```yaml
---
layout: post
title: 'Example Title'
date: 2 December 2014
link: http://example.com/link
---
```

To show the permalink icon and make the title link, I added an if statement to the post waterfall. I also wanted to show the entire post's content if it was a link post, rather than the standard excerpt. I also used a simple Unicode circle for the permalink to ensure cross-compatibility.

```liquid
<h2 class="post-title">
   <a href="
      {% if post.link %}
         {{ post.link }}
      {% else %}
         {{ post.url }}
     {% endif %}">{{ post.title }}</a>
   {% if post.link %}
      <span class="permalink">
         <a href="{{ post.url | prepend: site.url }}">&#9679;</a>
      </span>
   {% endif %}
</h2>
{% if post.link %}
  {{ post.content }}
{% else %}
   {{ post.excerpt | strip_html }}
{% endif %}
```

Link posts are now a reality!

Since I was going to roll a CDN for the media, I needed it all in the same folder structure to make things easier. Hosted Ghost instances are pretty limited in what you have access to, so I had Josh request a structured media archive from Ghost support. I decided that was taking too long, so I just used [SiteSucker](https://itunes.apple.com/us/app/sitesucker/id442168834?mt=12&uo=4&at=11lwLJ) to download all of the media from the existing Ghost site. This also went rather smoothly.

For the CDN, I chose Amazon [CloudFront](http://aws.amazon.com/cloudfront/) and S3 for storage. Working with AWS is always a pleasure, and I had the CDN up and running smoothly within minutes.

At this point, the structure of the site and design was pretty much complete. The project was now at a critical stage: how would Josh create new posts. Generally, using Jekyll requires a bit of Terminal.app usage, combined with Git (if you're using GitHub Pages). This can be daunting for new users. Since I knew Josh uses the excellent Editorial app, both for iPad and for iPhone, I decided to build a few workflows for him.

The first workflow generates the necessary YAML header data for Jekyll to display the correct layout, title, and post date. This workflow is public, and you can download it here. Once the post is all written out, we needed to post it to the correct branch (gh-pages) of the GitHub Pages repository (thenewsprint/thenewsprint.co). I found part of a Python script somewhere and adapted and tweaked it to fit Josh's needs. You can see the script here.

That's it!

If you're curious, the entire site lives on this GitHub repository. Feel free to browse the code and let me know how I can improve it!

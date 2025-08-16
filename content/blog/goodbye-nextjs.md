---
title: Goodbye, Next.js 👋
date: 2024-02-11
published: true
---

> A quick disclaimer. This article is not intended to disparage Next.js – I work with Next.js every day, and really quite enjoy it. This is simply a study in using an outsized solution for a trivial problem.

In 2023, I decided to re-create my personal website using Next.js. I even [wrote about it](https://jwww.me/blog/building-a-personal-blog-with-next-13-part-1). The building process was a lot of fun, and I even built a fun personal [Twitter feed alternative](https://jwww.me/feed).

Unfortunately, when it came to updating the blog, things didn't quite go so well. It can be hard enough to motivate yourself to write on your blog (especially if you're just getting back into it), and having a site that doesn't build correctly due to a dependency issue or a platform issues doesn't make it any easier.

For example, I recently tried to update the Twitter authentication (used solely by me to post statuses to the aforementioned feed page) to use Mastodon. This meant I had to update NextAuth.js, which meant I had to rewrite most of the session config for the whole site. The latest version of NextAuth.js is in beta, and I ran into a number of bugs that prevented me from proceeding.

This sentiment kind of echos my overall experience of using the Next.js App Router has been – feels like beta and a lot of unreconcilable issues. I'm not [the only one](https://www.flightcontrol.dev/blog/nextjs-app-router-migration-the-good-bad-and-ugly). I'm a huge fan of their Pages Router though, and will continue to use and recommend it.

I love JavaScript. I love Deno, Express, Remix, Bun, Vite, and jQuery. I love Next.js. I might even say I love TypeScript. Those, and so many more JavaScript frameworks, tools, and libraries have pushed the web forward, along with my career. However, it didn't make a whole lot of sense to me to use a JS based tool to build and serve my website – particularly since this site has no client facing JS.

In the end, I rewrote the blog in PHP, hosted on Vercel using the unsupported [vercel-php runtime](https://github.com/vercel-community/php). It's probably brittle and is not really production battle-tested, but I don't forsee running into a whole lot of scaling issues on my personal website.

This was a lot of fun. This made me feel like developing for the web felt like when I started two decades ago. No frameworks or metaframeworks, just a few PHP files and a PHP dev server. Sure, there was some platform quirks I had to work around (a result of my own architectural choice), and I reached for a few libraries to simplify the process, but overall, it felt a bit closer to bare metal that I have been for a while.

Props to the Next.js team for the work they've done to make developing full-stack applications as simple as possible (in their own flavour) in a world jam-packed with tools, practices, and tutorials.

This is goodbye, but not really.

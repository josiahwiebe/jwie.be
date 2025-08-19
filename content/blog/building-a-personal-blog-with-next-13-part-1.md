---
title: Building A Personal Blog With Next.js 13 - Part 1
slug: building-a-personal-blog-with-next-13-part-1
date: '2023-01-26T00:00:00.000Z'
updated: '2025-08-19T03:10:59.000Z'
excerpt: >-
  Building a personal blog using Next.js, Tailwind CSS, next-mdx-remote,
  Planetscale, and Prisma.
published: true
---
In the last number of years, I'd completely come to rely on using Twitter as a way to "put things out into the world", as well as keep up to date with what's going on in the world.

The sale of Twitter had folks thinking about "owning their own platform" and I was no different. In late 2022, I decided to re-vitalize my website by building my own personal feed. Next.js 13 had just launched with the new `appDir` beta, and I thought it would be a a great opportunity to test out some new tools.

# Getting Started with Next.js 13

This article is going to be a multi-part series. I'm going to be building a personal blog using Next.js 13, Tailwind CSS, next-mdx-remote, Planetscale, and Prisma. I'm going to be writing about the process of building the site, as well as the tools I'm using.

1. [Getting Started with Next.js 13](/blog/building-a-personal-blog-with-nextjs-13-part-1) (this post)
2. Building the Blog
3. Creating a Personal Feed with Planetscale and Prisma
4. Adding Authentication with Next-Auth.js

## The Stack

- [Next.js 13](https://nextjs.org/blog/next-13) (using `appDir` beta)
- [Tailwind CSS](https://tailwindcss.com/)
- [Planetscale](https://planetscale.com/)
- [Prisma](https://www.prisma.io/)
- [Next-Auth.js](https://next-auth.js.org/)
- Vercel

## The Process

### Setup Next.js 13

My personal website was already built using Next.js, so the first step was to upgrade to Next.js 13. I followed the [upgrade guide](https://nextjs.org/docs/upgrading) and everything went smoothly. They allow you to move to the new `appDir` beta incrementally by adding a `next.config.js` file to the root of your project.

```js
module.exports = {
  experimental: {
    appDir: true,
  },
}
```

With that configured, I could start to move my `pages` directory into the `app` directory. I would also start converting my components to React Server Components.

I was previously using the `@next/mdx` package for MDX support, but I wanted some additional flexibility to be able to work with MDX in a more dynamic way. I also wanted to be able to use traditional Markdown style front-matter. I decided to use [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote) instead. As a result, I removed the `withMDX` config from my `next.config.js` file.

Since I was already using Tailwind CSS on the site, the only change I had to make to `tailwind.config.js` was to add the `app` directory to the `content` array.

```js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}', // added this line
    './pages/**/*.{js,jsx,ts,tsx}',
  ],
},
```

### Converting Pages to React Server Components

#### Setting Up The New `app` Directory

In previous versions of Next.js, you created a file in the `pages` directory and exported a React component. With Next.js 13, you can now create a file in the `app` directory and export a React Server Component.

With this new approach, routes are defined using **folders** rather than files, and you can continue to use the `pages` directory for other things like API routes.

You can also create "route groups" using folder names with (parentheses). This is a great wya to organize your files in a meaninful way, without affecting the routing.

Here's how my `pages` directory looked before:

```bash
/pages
├── _app.tsx
├── index.tsx
├── uses.mdx
├── posts
│   ├── post-name.mdx
│   └── another-post.mdx
```

And here's how it looks now:

```bash
/app
├── head.tsx
├── layout.tsx
├── page.tsx
├── blog
│   ├── [...slug]
│   │   ├── head.tsx
│   │   └── page.tsx
│   ├── head.tsx
│   └── page.tsx
├── (pages)
│   ├── [...slug]
│   │   ├── head.tsx
│   │   └── page.tsx
│   └── denied
│       └── page.tsx
```

Note the `layout.tsx`, and `page.tsx` files at the top of the directory. These are the bare minimum files you need to create a React Server Component route. I've also used the `head.tsx` special file to define the `<Head>` component for each route.

If there is no `layout.tsx` file in a folder, it will bubble up to the root layout in the `app` directory. If there is no `page.tsx` file in a folder, it will bubble up to the root page in the `app` directory.

Also note the `(pages)` directory. Since this one is wrapped in parentheses, it will not be used for routing. It's just a way to organize your files.

I used dynamic catch-all segments with a `[...slug]` for the blog sub-routes as well as the pages sub-routes. This allows me to create a single `page.tsx` file for each route, and then use the `slug` parameter to determine which page to render.

#### Converting Pages to React Server Components

Now that the new directory structure has been configured, it's time to start converting the pages to React Server Components.

I started with the root layout file, since this is going to define the overall base layout for the site. For brevity, I'm not going to post the entire contents of these files, but you can find the full source code on [GitHub](https://github.com/josiahwiebe/jwie.be).

```jsx
import '@styles/styles.css'
import Link from 'next/link'

const getYear = () => {
  const now = new Date()
  return now.getFullYear()
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body class='mx-auto my-0 p-4 max-w-5xl font-sans text-black bg-white'>
        <header class='mb-8 pb-4 border-b'>
          <h1>
            <Link href='/' class='text-black no-underline'>
              Josiah Wiebe
            </Link>
          </h1>
        </header>
        <main>{children}</main>
        <footer class='mt-12 pt-8 w-full'>
          <p>&copy; 2011—{getYear()} Josiah Wiebe. All rights reserved.</p>
        </footer>
      </body>
    </html>
  )
}
```

Note the `{children}` prop. This is where the content for each page will be rendered.

Next, I created the `page.tsx` file for the root route. This will be our index page. Just like the convention for the previous `pages` directory, this file should simply export a React component.

```jsx
export default async function IndexPage() {
  return (
    <section class='page-content grid items-center'>
      <div class='flex flex-col gap-4'>
        <h1 class='text-2xl font-bold'>Hello, world!</h1>
        <p class='text-lg text-gray-500'>Welcome to my brand new website, built with Next.js 13.</p>
      </div>
    </section>
  )
}
```

The `head.tsx` file is a special file that will be used to define the `<Head>` component for the route. This is where you can define the title, meta tags, and other things that will be rendered in the `<head>` element of the page.

I created a custom `PageHead` component that will be used to define the `<Head>` component for each page. This component will accept a `title` prop, and will automatically append the site name to the end of the title.

```jsx
interface PageHeadProps {
  params: {
    title: string,
  };
}

export default function PageHead({ params = { title: '' } }: PageHeadProps) {
  const title = `${params.title} - Josiah Wiebe`

  return (
    <>
      <meta charSet='utf-8' />
      <title>{title}</title>
      <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
    </>
  )
}
```

Now we can load that component in the `head.tsx` file for the root route.

```jsx
import PageHead from '@components/page-head'

export default function Head() {
  return <PageHead params={{ title: 'Josiah Wiebe', overrideTitle: true }} />
}
```

Since we'll want each page to have a unique title, we'll have to create a `head.tsx` special file in each route directory. We can re-use the `PageHead` component, but we'll need to pass in the title for each page. This is probably my least favourite convention with the new `appDir` directory structure, but creating a reusable component makes it easier.

That's all for the base layout and index page. At this point, we should have a functioning site.

In my next post, I'll walk through the method I used to setup the blog and pages routes. I'll also show you how I use `next-mdx-remote` to render the blog posts and pages, combined with the power of dynamic catch-all route segments.

To keep up to date with my latest posts, you can follow me on [Twitter](https://twitter.com/josiahwiebe) or [Mastodon](https://mastodon.social/@josiahwiebe), or subscribe to my [RSS feed](https://jwww.me/feed.xml).

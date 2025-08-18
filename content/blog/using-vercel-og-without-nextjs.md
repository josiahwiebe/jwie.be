---
title: Using @vercel/og without Next.js
slug: using-vercel-og-without-nextjs
date: '2024-02-12T00:00:00.000Z'
updated: '2025-08-18T13:37:58.000Z'
excerpt: ''
published: true
---
I've used the helpful [@vercel/og](https://vercel.com/docs/functions/og-image-generation) package before to generate OpenGraph images within Next.js projects, but since I re-wrote this blog using PHP, this was no longer possible.

The documentation has some hints of "using @vercel/og without Next.js" but there is no real documentation for it.

After some scouring, I discovered `unstable_createNodejsStream` in the TypeScript definitions

First, let's setup the route in the `vercel.json` config file. This step is optional, depending on your configuration. Since I have PHP endpoints in my `/api` directory as well, I need to make sure that accessing `/api/og` points to the right place.

```json
// vercel.json
{
  "routes": [
    {
      "src": "/api/og",
      "dest": "/api/og.mjs"
    }
  ]
}

```

Now, let's install the dependencies.

```bash
npm install @vercel/og -S

```

We're going to use the undocumented `unstable_createNodejsStream` method to generate our OG images. This is at odds with some of what the [documentation says](https://vercel.com/docs/functions/og-image-generation/og-image-api):

> `@vercel/og` only supports the Edge runtime. The default Node.js runtime will not work.

However, a [different page](https://vercel.com/docs/functions/og-image-generation#runtime-caveats) of the docs say that the Node.js runtime _is_ supported 🤷‍♂️

I'd prefer to use the documented `ImageResponse` method that runs on Vercel Edge Functions, but I wasn't able to get it working locally without Next.js. Using `unstable_createNodejsStream` allowed me to work with it both locally and in production.

We'll setup our function handler and some of the base config stuff first. From the `@vercel/og` documentation:

> If you're not using a framework, you must either add `"type": "module"` to your `package.json` or change your JavaScript Functions' file extensions from `.js` to `.mjs`

```js
// api/og.mjs
import fs from 'fs'
import path from 'path'
import { unstable_createNodejsStream } from '@vercel/og'

export default async function handler(req, res) {
  try {
    const searchParams = new URL(req.url, `https://${req.headers.host}`).searchParams

    // this will look for the title query param as such ?title=<title>
    const hasTitle = searchParams.has('title')
    const title = hasTitle ? searchParams.get('title')?.slice(0, 100) : 'Blog Title'

    // since we're using the Node.js runtime, we can read fonts using fs
    const fontBold = fs.readFileSync(path.resolve('./public/fonts/Font-Bold.ttf'))
    const fontRegular = fs.readFileSync(path.resolve('./public/fonts/Font-Regular.ttf'))

    // setup the stream. the `html` variable will be undefined so far
    const stream = await unstable_createNodejsStream(html, {
      width: 1200,
      height: 630,
      fonts: [
        {
          data: FontBold,
          name: 'Sans Bold',
          style: 'normal',
        },
        {
          data: FoldRegular,
          name: 'Sans Regular',
          style: 'normal',
        },
      ],
    })
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.statusCode = 200
    res.statusMessage = 'OK'
    stream.pipe(res)
  } catch (e) {
    console.error(e)
    console.log(`${e.message}`)
    return new Response('Failed to generate the image', {
      status: 500,
    })
  }
}

```

Both the `unstable_createNodeJsStream` and `ImageResponse` methods expect a JSX `ReactElement` property to be passed. However, we're not using Next.js here, and we don't have React installed in the project. Luckily, we can simply manually create the structure of the expected JSX output:

```js
const html = {
  type: 'div',
  props: {
    children: [
      {
        type: 'div',
        props: {
          tw: 'pl-10 shrink flex -mt-20',
          children: [
            {
              type: 'div',
              props: {
                tw: 'text-white text-8xl',
                style: {
                  fontFamily: 'Sans Bold',
                },
                children: title,
              },
            },
          ],
        },
      },
      {
        type: 'div',
        props: {
          tw: 'absolute left-12 bottom-12 flex items-center pl-12',
          children: [
            {
              type: 'div',
              props: {
                tw: 'text-white text-4xl',
                style: {
                  fontFamily: 'Sans Bold',
                },
                children: 'Josiah Wiebe',
              },
            },
            {
              type: 'div',
              props: {
                tw: 'px-2 text-4xl text-white',
                style: {
                  fontSize: '30px',
                },
                children: '—',
              },
            },
            {
              type: 'div',
              props: {
                tw: 'text-4xl text-gray-200',
                children: '@josiahwiebe',
              },
            },
          ],
        },
      },
    ],
    tw: 'w-full h-full flex items-center relative px-12 rounded-3xl',
    style: {
      background: 'linear-gradient(230deg, #f0ecc1 0%, #f2787c 100%)',
      fontFamily: 'Vulf Sans Regular',
    },
  },
}

```

The library also supports TailwindCSS through the use of the `tw` property, so we can simply pass any desired Tailwind classes there.

Put that all together, then access `/api/og?title=Your Title Here` and it should return a PNG of your freshly minted on-demand OG image!

^^^
![](/img/using-vercel-og-without-nextjs/og.png)
^^^ Our generated OG image

To add this OG image to your HTML, simply include this HTML in the `<head>` of your page:

```html
<meta name="og:image" content="/api/og?title=Using @vercel/og without Next.js" />

```

That's it!

If you have any questions about this implementation, hit me up on [Twitter](https://twitter.com/josiahwiebe) or [Mastodon](https://mastodon.social/@josiahwiebe).

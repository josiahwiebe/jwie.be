import fs from 'fs'
import path from 'path'
import { unstable_createNodejsStream } from '@vercel/og'

export default async function handler(req, res) {
  try {
    const searchParams = new URL(req.url, `https://${req.headers.host}`).searchParams

    // ?title=<title>
    const hasTitle = searchParams.has('title')
    const title = hasTitle ? searchParams.get('title')?.slice(0, 100) : 'My default title'

    const VulfSansBold = fs.readFileSync(path.resolve('./public/fonts/Vulf_Sans-Bold.ttf'))
    const VulfSansRegular = fs.readFileSync(path.resolve('./public/fonts/Vulf_Sans-Regular.ttf'))

    const html = {
      type: 'div',
      props: {
        children: [
          {
            type: 'div',
            props: {
              tw: 'pl-10 shrink flex',
              children: [
                {
                  type: 'div',
                  props: {
                    tw: 'text-white text-9xl',
                    style: {
                      fontSize: '64px',
                      fontFamily: 'Vulf Sans Bold',
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
              tw: 'absolute right-[40px] bottom-[40px] flex items-center',
              children: [
                {
                  type: 'div',
                  props: {
                    tw: 'text-white text-4xl',
                    style: {
                      fontFamily: 'Vulf Sans Bold',
                    },
                    children: 'Josiah Wiebe',
                  },
                },
                {
                  type: 'div',
                  props: {
                    tw: 'px-2 text-4xl text-gray-300',
                    style: {
                      fontSize: '30px',
                    },
                    children: '|',
                  },
                },
                {
                  type: 'div',
                  props: {
                    tw: 'text-4xl text-gray-300',
                    children: '@josiahwiebe',
                  },
                },
              ],
            },
          },
        ],
        tw: 'w-full h-full flex items-center justify-center relative px-22',
        style: {
          background: 'linear-gradient(135deg, #f0ecc1 0%, #9fddf4 50%, #f2787c 100%)',
          fontFamily: 'Vulf Sans Regular',
        },
      },
    }

    const stream = await unstable_createNodejsStream(html, {
      width: 1200,
      height: 630,
      fonts: [
        {
          data: VulfSansBold,
          name: 'Vulf Sans Bold',
          style: 'normal',
        },
        {
          data: VulfSansRegular,
          name: 'Vulf Sans Regular',
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
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}

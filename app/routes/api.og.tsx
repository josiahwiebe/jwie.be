import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LoaderFunctionArgs } from 'react-router'
import { ImageResponse } from '@vercel/og'

/**
 * OG image generator resource route
 * Generates dynamic Open Graph images with custom fonts
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url)
    const title = url.searchParams.get('title')?.slice(0, 100) ?? 'My default title'

    const VulfSansBold = readFileSync(resolve('./public/fonts/Vulf_Sans-Bold.ttf'))
    const VulfSansRegular = readFileSync(resolve('./public/fonts/Vulf_Sans-Regular.ttf'))

    return new ImageResponse(
      (
        <div
          tw="w-full h-full flex items-center relative px-12 rounded-3xl"
          style={{
            background: 'linear-gradient(230deg, #f0ecc1 0%, #f2787c 100%)',
            fontFamily: 'Vulf Sans Regular',
          }}
        >
          <div tw="pl-10 shrink flex -mt-20">
            <div
              tw="text-white text-8xl"
              style={{ fontFamily: 'Vulf Sans Bold' }}
            >
              {title}
            </div>
          </div>
          <div tw="absolute left-12 bottom-12 flex items-center pl-12">
            <div
              tw="text-white text-4xl"
              style={{ fontFamily: 'Vulf Sans Bold' }}
            >
              Josiah Wiebe
            </div>
            <div tw="px-2 text-4xl text-white" style={{ fontSize: '30px' }}>
              —
            </div>
            <div tw="text-4xl text-gray-200">@josiahwiebe</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { data: VulfSansBold, name: 'Vulf Sans Bold', style: 'normal' },
          { data: VulfSansRegular, name: 'Vulf Sans Regular', style: 'normal' },
        ],
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      }
    )
  } catch (e) {
    console.error(e)
    return new Response('Failed to generate the image', { status: 500 })
  }
}

import type { MetaFunction } from 'react-router'

import { BlackSpruceLogo } from '~/components/BlackSpruceLogo'

export const meta: MetaFunction = () => [
  { title: 'Josiah Wiebe' },
  {
    name: 'description',
    content: 'Multi-disciplinary developer and marketing manager based in the Canadian Prairies.',
  },
  { property: 'og:title', content: 'Josiah Wiebe' },
  {
    property: 'og:description',
    content: 'Multi-disciplinary developer and marketing manager based in the Canadian Prairies.',
  },
  { property: 'og:image', content: '/api/og?title=Josiah%20Wiebe' },
]

/**
 * Home page route.
 */
export default function Home() {
  return (
    <section className='page-content col-span-full grid items-center'>
      <div className='flex flex-col gap-4'>
        <h1 className='font-heading text-2xl font-bold sm:text-3xl md:text-4xl dark:text-slate-300'>
          👋 Hi, I'm Josiah
        </h1>
        <p className='text-gray-500 lg:text-lg dark:text-slate-300'>
          I'm a multi-disciplinary full-stack marketing engineer based in the Canadian Prairies. I currently lead the
          marketing team at <a href='https://leisurevans.com/'>Leisure Travel Vans</a>.
        </p>
        <p className='text-gray-500 lg:text-lg dark:text-slate-300'>
          Putting AI to work for you at{' '}
          <a
            href='https://blackspruce.dev/'
            className='inline-flex items-center gap-2 align-middle no-underline hover:no-underline'
          >
            <BlackSpruceLogo className='-mt-1 h-6 w-auto shrink-0' />
          </a>
        </p>
      </div>
    </section>
  )
}

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useLocation,
} from 'react-router'
import type { Route } from "./+types/root";

import './styles/app.css'

const navItems = [
  { name: 'Blog', slug: '/blog' },
  { name: 'Playground', slug: '/playground' },
  { name: 'Logbook', slug: '/logbook' },
  { name: 'Not here', slug: '/online' },
] as const

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: '/css/fonts.css' },
  { rel: 'stylesheet', href: '/css/nord.css' },
  { rel: 'alternate', type: 'application/rss+xml', title: 'RSS Feed for jwie.be', href: '/feed.xml' },
  { rel: 'icon', href: '/favicon.ico' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/static/favicon-16x16.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/static/favicon-32x32.png' },
  { rel: 'apple-touch-icon', href: '/static/apple-touch-icon.png' },
  { rel: 'me', href: 'https://mastodon.social/@josiahwiebe' },
  { rel: 'me', href: 'https://x.com/josiahwiebe' },
  { rel: 'me', href: 'https://bsky.app/profile/jwie.be' },
  { rel: 'me authn', href: 'https://github.com/josiahwiebe' },
  { rel: 'authorization_endpoint', href: 'https://indieauth.com/auth' },
]

export const meta: Route.MetaFunction = () => [
  { charSet: 'utf-8' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
  { name: 'theme-color', content: '#f2787c' },
]

/**
 * Root layout component providing the app shell with header, footer, and navigation.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const uriSegment = '/' + (location.pathname.split('/')[1] || '')

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="grid-row site-header">
          <h1 className="site-title">
            <Link to="/" className="text-black dark:text-slate-300 no-underline">
              JWWW
            </Link>
          </h1>
          <nav className="site-nav">
            <ul className="flex flex-row flex-wrap gap-4 list-none">
              {navItems.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={item.slug}
                    className={uriSegment && item.slug.startsWith(uriSegment) && uriSegment !== '/' ? 'is-active' : ''}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="grid-row site-content">
          {children}
        </main>

        <footer className="grid-row site-footer">
          <div className="footer-content">
            <div className="text-xs text-gray-500 leading-5 mt-4 space-x-3 flex items-center">
              <Link to="/feed.xml" className="text-gray-500 dark:text-slate-400 no-underline hover:no-underline">
                RSS
              </Link>
              <Link to="/archive" className="text-gray-500 dark:text-slate-400 no-underline hover:no-underline">
                Archive
              </Link>
              <span className="w-full h-1 mt-1 inline-flex border-t border-gray-200 dark:border-slate-700" />
              <a href="https://twitter.com/josiahwiebe" rel="me" className="text-gray-500 dark:text-slate-400 no-underline hover:no-underline">
                Twitter
              </a>
              <a href="https://bsky.app/profile/jwie.be" rel="me" className="text-gray-500 dark:text-slate-400 no-underline hover:no-underline">
                Bluesky
              </a>
              <a href="https://mastodon.social/@josiahwiebe" rel="me" className="text-gray-500 dark:text-slate-400 no-underline hover:no-underline">
                Mastodon
              </a>
              <a href="https://instagram.com/josiahwiebe" rel="me" className="text-gray-500 dark:text-slate-400 no-underline hover:no-underline">
                Instagram
              </a>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400 leading-5 block mt-4">
              © 2011–{new Date().getFullYear()}
            </span>
          </div>
        </footer>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

/**
 * Root component that renders child routes via Outlet.
 */
export default function Root() {
  return <Outlet />
}

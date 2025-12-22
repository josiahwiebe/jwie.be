import { type RouteConfig, index, route, prefix } from '@react-router/dev/routes'
import { getSectionSlugs } from './lib/posts.server'

const sections = await getSectionSlugs()

export default [
  index('routes/home.tsx'),

  // API resource routes
  route('api/og', 'routes/api.og.tsx'),
  route('api/ghost-hook', 'routes/api.ghost-hook.ts'),

  // Dynamic section routes (blog, archive, logbook, etc.)
  ...sections.flatMap((section) =>
    prefix(section, [
      index('routes/section.index.tsx', { id: `${section}-index` }),
      route(':slug', 'routes/section.post.tsx', { id: `${section}-post` }),
    ])
  ),

  // Playground routes (special case with custom routes)
  ...prefix('playground', [
    index('routes/playground/index.tsx'),
    route('lastfm', 'routes/playground/lastfm.tsx'),
    route(':slug', 'routes/playground/post.tsx'),
  ]),

  // Static pages
  route(':slug', 'routes/page.tsx'),
] satisfies RouteConfig

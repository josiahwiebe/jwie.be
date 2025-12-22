/**
 * Generates RSS feed from markdown content.
 * Matches output format of util/feed.php
 * Run with: bun run scripts/generate-rss.ts
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

const SITE_URL = 'https://jwww.me'
const SITE_TITLE = 'Josiah Wiebe – Blog'
const SITE_DESCRIPTION = 'Feed of blog posts from jwww.me'

interface Post {
  title: string
  slug: string
  date: string
  content: string
  section: string
}

function getPostsFromDir(dir: string, section: string): Post[] {
  const contentDir = join(process.cwd(), 'content', dir)
  const posts: Post[] = []

  try {
    const files = readdirSync(contentDir)
    for (const file of files) {
      if (!file.endsWith('.md') || file === 'index.md') continue

      const filePath = join(contentDir, file)
      if (!statSync(filePath).isFile()) continue

      const fileContent = readFileSync(filePath, 'utf-8')
      const { data, content } = matter(fileContent)

      if (data.title && data.date) {
        posts.push({
          title: data.title,
          slug: file.replace('.md', ''),
          date: new Date(data.date).toISOString(),
          content,
          section,
        })
      }
    }
  } catch (e) {
    console.warn(`Could not read ${dir}:`, e)
  }

  return posts
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Wraps content in CDATA if it contains special characters.
 */
function wrapCdata(str: string): string {
  if (str.includes('<') || str.includes('>') || str.includes('&')) {
    return `<![CDATA[${str}]]>`
  }
  return str
}

function generateRssFeed(posts: Post[]): string {
  const sortedPosts = posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const now = new Date().toUTCString()
  const year = new Date().getFullYear()

  const items = sortedPosts
    .map((post) => {
      const link = `${SITE_URL}/${post.section}/${post.slug}`
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <content:encoded>${wrapCdata(post.content)}</content:encoded>
      <guid isPermaLink="true">${link}</guid>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <copyright>2011-${year} Josiah Wiebe</copyright>
    <language>en-CA</language>
${items}
  </channel>
</rss>`
}

// Main
const blogPosts = getPostsFromDir('blog', 'blog')
const logbookPosts = getPostsFromDir('logbook', 'logbook')
const archivePosts = getPostsFromDir('archive', 'archive')
const allPosts = [...blogPosts, ...logbookPosts, ...archivePosts]

const feed = generateRssFeed(allPosts)
const outputPath = join(process.cwd(), 'build', 'client', 'feed.xml')

try {
  writeFileSync(outputPath, feed, 'utf-8')
  console.log(`✓ RSS feed generated: ${outputPath} (${allPosts.length} posts)`)
} catch (e) {
  // build/client might not exist yet during first build
  const fallbackPath = join(process.cwd(), 'public', 'feed.xml')
  writeFileSync(fallbackPath, feed, 'utf-8')
  console.log(`✓ RSS feed generated: ${fallbackPath} (${allPosts.length} posts)`)
}

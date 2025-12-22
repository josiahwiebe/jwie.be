/**
 * Generates RSS feed from markdown content.
 * Matches output format of util/feed.php
 * Run with: bun run scripts/generate-rss.ts
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeExternalLinks from 'rehype-external-links'

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

/**
 * Pre-process markdown to handle figure syntax before parsing.
 * Converts ^^^ blocks to HTML figures.
 */
function preprocessFigures(markdown: string): string {
  const figureRegex = /\^\^\^\s*\n([\s\S]*?)\n\^\^\^\s*([^\n]*)/g

  return markdown.replace(figureRegex, (_, content: string, caption: string) => {
    const trimmedCaption = caption.trim()
    const figcaptionHtml = trimmedCaption ? `<figcaption>${trimmedCaption}</figcaption>` : ''

    return `<figure>\n\n${content.trim()}\n\n${figcaptionHtml}</figure>`
  })
}

/**
 * Pre-process markdown to handle container syntax before parsing.
 * Converts ::: blocks to div elements with classes.
 */
function preprocessContainers(markdown: string): string {
  const containerRegex = /:::(\S*)\s*\n([\s\S]*?)\n:::/g

  return markdown.replace(containerRegex, (_, className: string, content: string) => {
    const classAttr = className ? ` class="${className}"` : ''
    return `<div${classAttr}>\n\n${content.trim()}\n\n</div>`
  })
}

/**
 * Convert markdown to HTML (simplified version without syntax highlighting for RSS).
 */
async function markdownToHtml(markdown: string): Promise<string> {
  let processed = preprocessFigures(markdown)
  processed = preprocessContainers(processed)

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processed)

  return String(result)
}

async function getPostsFromDir(dir: string, section: string): Promise<Post[]> {
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
        const htmlContent = await markdownToHtml(content)
        posts.push({
          title: data.title,
          slug: file.replace('.md', ''),
          date: new Date(data.date).toISOString(),
          content: htmlContent,
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
async function main() {
  const blogPosts = await getPostsFromDir('blog', 'blog')
  const logbookPosts = await getPostsFromDir('logbook', 'logbook')
  const archivePosts = await getPostsFromDir('archive', 'archive')
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
}

main()

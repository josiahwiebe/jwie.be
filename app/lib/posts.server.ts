import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

export interface PostFrontmatter {
  title: string
  slug: string
  date: string
  updated?: string
  excerpt?: string
  published?: boolean
  layout?: string
  subtitle?: string
  type?: string
  showYear?: boolean
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content')

/**
 * Get all slugs for a content directory (used for prerendering).
 * Excludes index.md files.
 */
export async function getAllPostSlugs(dir: string): Promise<string[]> {
  const dirPath = path.join(CONTENT_DIR, dir)

  try {
    const files = await fs.readdir(dirPath)
    const slugs = files
      .filter((file) => file.endsWith('.md') && file !== 'index.md')
      .map((file) => file.replace('.md', ''))

    return slugs
  } catch {
    return []
  }
}

/**
 * Get all posts from a content directory, sorted by date descending.
 * Filters out unpublished posts.
 */
export async function getAllPosts(dir: string): Promise<Post[]> {
  const slugs = await getAllPostSlugs(dir)
  const posts: Post[] = []

  for (const slug of slugs) {
    const post = await getPost(dir, slug)
    if (post && post.frontmatter.published !== false) {
      posts.push(post)
    }
  }

  // Sort by date descending
  posts.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime()
    const dateB = new Date(b.frontmatter.date).getTime()
    return dateB - dateA
  })

  return posts
}

/**
 * Get a single post by directory and slug.
 */
export async function getPost(dir: string, slug: string): Promise<Post | null> {
  const filePath = path.join(CONTENT_DIR, dir, `${slug}.md`)

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    return {
      slug,
      frontmatter: data as PostFrontmatter,
      content,
    }
  } catch {
    return null
  }
}

/**
 * Get the index page for a content directory.
 */
export async function getIndexPage(dir: string): Promise<Post | null> {
  const filePath = path.join(CONTENT_DIR, dir, 'index.md')

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    return {
      slug: dir,
      frontmatter: data as PostFrontmatter,
      content,
    }
  } catch {
    return null
  }
}

/**
 * Get all standalone page slugs (excludes index.md).
 */
export async function getPageSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(CONTENT_DIR)
    return files
      .filter((f) => f.endsWith('.md') && f !== 'index.md')
      .map((f) => f.replace('.md', ''))
  } catch {
    return []
  }
}

/**
 * Get a standalone page (e.g., /uses, /online).
 */
export async function getPage(slug: string): Promise<Post | null> {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`)

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    return {
      slug,
      frontmatter: data as PostFrontmatter,
      content,
    }
  } catch {
    return null
  }
}

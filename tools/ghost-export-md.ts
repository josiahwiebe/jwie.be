#!/usr/bin/env bun
/**
 * Export Ghost posts and pages → Markdown.
 * - Posts go to content/<tag>/<slug>.md (based on Ghost tags) or content/blog/<slug>.md (default)
 * - Pages go to content/<slug>.md (root level)
 * - Uses Ghost ADMIN API (includes draft posts/pages)
 * - Downloads referenced images to public/img/<slug>/ (organized by slug)
 * - Rewrites <img> src and feature_image to /img/<slug>/<filename>
 * - Writes files with YAML front‑matter
 * - Properly handles draft/published status
 * - Uses meaningful filenames when possible, falls back to hash
 *
 * Usage:
 *   bun tools/ghost-export-md.ts [posts|pages|all]
 *   Default: all
 *
 * Env:
 *   GHOST_URL, GHOST_ADMIN_KEY
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { parse } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import GhostAdminAPI from '@tryghost/admin-api';

const GHOST_URL = process.env.GHOST_URL!;
const GHOST_ADMIN_KEY = process.env.GHOST_ADMIN_KEY!;

if (!GHOST_URL || !GHOST_ADMIN_KEY) {
  console.error('Set GHOST_URL and GHOST_ADMIN_KEY');
  process.exit(1);
}

const OUT_CONTENT = path.join(process.cwd(), 'content');
const OUT_BLOG = path.join(OUT_CONTENT, 'blog');
const OUT_IMG = path.join(process.cwd(), 'public', 'img');
fs.mkdirSync(OUT_BLOG, { recursive: true });
fs.mkdirSync(OUT_IMG, { recursive: true });

const sha1 = (buf: Uint8Array | string) => crypto.createHash('sha1').update(buf).digest('hex');

// Process lexical content to handle video blocks and preserved markdown
function processLexicalContent(lexicalStr?: string): { videos: Array<{src: string, caption: string, alt: string}>, markdownBlocks: string[] } {
  const videos: Array<{src: string, caption: string, alt: string}> = [];
  const markdownBlocks: string[] = [];

  if (!lexicalStr) return { videos, markdownBlocks };

  try {
    const lexical = JSON.parse(lexicalStr);

    function processNode(node: any) {
      // Handle video blocks
      if (node.type === 'video') {
        videos.push({
          src: node.src || '',
          caption: node.caption || '',
          alt: node.alt || node.fileName || ''
        });
      }

      // Handle code blocks that might contain preserved markdown (both 'code' and 'codeblock' types)
      // We're using this to support :::image-half blocks that contain videos (workaround since Ghost doesn't support videos in galleries)
      if ((node.type === 'code' || node.type === 'codeblock') && node.language === 'markdown') {
        markdownBlocks.push(node.code || '');
      }

      // Recursively process children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(processNode);
      }
    }

    if (lexical?.root?.children) {
      lexical.root.children.forEach(processNode);
    }
  } catch (e) {
    console.error('Error processing lexical content:', e);
  }

  return { videos, markdownBlocks };
}

// Pre-process Ghost HTML to handle special elements before markdown conversion
function preprocessGhostHtml(html: string): { html: string; placeholders: Record<string, string> } {
  const doc = parse(html);
  const nhm = new NodeHtmlMarkdown({
    bulletMarker: '-',
  });
  const placeholders: Record<string, string> = {};

  // Process Ghost gallery cards first (these become :::image-half blocks)
  const galleryCards = doc.querySelectorAll('figure.kg-gallery-card');
  galleryCards.forEach((figure, index) => {
    const images = figure.querySelectorAll('img');
    if (images.length === 0) return;

    // Extract and convert gallery caption to markdown if it exists
    const figcaption = figure.querySelector('figcaption');
    let galleryCaption = '';
    if (figcaption) {
      // Convert caption HTML to markdown to preserve formatting
      galleryCaption = nhm.translate(figcaption.innerHTML).trim();
    }

    // Split caption by | for individual images
    const splitCaptions = galleryCaption ? galleryCaption.split('|').map(c => c.trim()) : [];

    let result = ':::image-half\n';

    images.forEach((img, imgIndex) => {
      // Start each image block with ^^^
      result += '^^^\n';

      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      result += `![${alt}](${src})\n`;

      // Add caption if exists (this also serves as the closing ^^^)
      const caption = splitCaptions[imgIndex] || '';
      if (caption) {
        result += `^^^ ${caption}\n`;
      } else {
        // No caption, but we still need the closing ^^^
        result += '^^^\n';
      }
    });

    result += ':::';

    // Create a unique placeholder
    const placeholder = `GHOSTGALLERY${index}`;
    placeholders[placeholder] = result;

    // Replace the figure with a paragraph containing the placeholder to preserve spacing
    const placeholderNode = parse(`<p>${placeholder}</p>`);
    figure.replaceWith(placeholderNode);
  });

  // Process standalone image cards with captions
  const imageFigures = doc.querySelectorAll('figure.kg-image-card');
  imageFigures.forEach((figure, index) => {
    const img = figure.querySelector('img');
    if (!img) return;

    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const figcaption = figure.querySelector('figcaption');

    let result: string;
    if (figcaption) {
      // Convert caption HTML to markdown to preserve formatting
      const captionMarkdown = nhm.translate(figcaption.innerHTML).trim();
      result = `^^^\n![${alt}](${src})\n^^^ ${captionMarkdown}`;
    } else {
      // No caption, just the image
      result = `![${alt}](${src})`;
    }

    // Create a unique placeholder
    const placeholder = `GHOSTIMAGE${index}`;
    placeholders[placeholder] = result;

    // Replace the figure with a paragraph containing the placeholder to preserve spacing
    const placeholderNode = parse(`<p>${placeholder}</p>`);
    figure.replaceWith(placeholderNode);
  });

  // Process markdown code blocks (preserved :::image-half blocks)
  const codeBlocks = doc.querySelectorAll('pre code.language-markdown');
  codeBlocks.forEach((code, index) => {
    const markdownContent = code.innerHTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Only unwrap blocks that have our special marker (preserved video content)
    if (markdownContent.includes('<!-- GHOST_VIDEO_CONTENT -->')) {
      // Remove the marker and preserve the content
      const cleanContent = markdownContent.replace('<!-- GHOST_VIDEO_CONTENT -->\n', '');

      // Create a unique placeholder for this markdown content
      const placeholder = `GHOSTMARKDOWN${index}`;
      placeholders[placeholder] = cleanContent;

      // Replace the entire pre block with a simple text node containing the placeholder
      const preElement = code.closest('pre');
      if (preElement) {
        const placeholderNode = parse(placeholder);
        preElement.replaceWith(placeholderNode);
      }
    }
    // Leave legitimate markdown code blocks unchanged
  });

  return { html: doc.toString(), placeholders };
}

function extFrom(url: string, defaultExt = 'jpg') {
  try {
    const m = new URL(url).pathname.match(/\.(avif|webp|png|jpe?g|gif|bmp|svg|mp4|webm|mov)$/i);
    return (m ? m[1].toLowerCase() : defaultExt).replace('jpeg','jpg');
  } catch { return defaultExt; }
}

async function download(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}
function collectImageUrls(html?: string, feature?: string | null, videos?: Array<{src: string}>) {
  const urls = new Set<string>();
  if (feature && /^https?:\/\//.test(feature)) urls.add(feature);
  if (!html) return [...urls];
  const root = parse(html);
  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && /^https?:\/\//.test(src)) urls.add(src);
  });
  // Add video URLs
  if (videos) {
    videos.forEach(video => {
      if (video.src && /^https?:\/\//.test(video.src)) urls.add(video.src);
    });
  }
  return [...urls];
}

async function downloadAndRewriteImages(html?: string, feature?: string | null, postSlug?: string, videos?: Array<{src: string}>) {
  const manifest: Record<string,string> = {};
  for (const u of collectImageUrls(html, feature, videos)) {
    try {
      const url = new URL(u);

      // Check if this is already pointing to our organized structure
      if ((url.hostname === 'jwie.be' || url.hostname === 'jwww.me') && url.pathname.startsWith('/img/') && postSlug) {
        const pathParts = url.pathname.split('/');
        if (pathParts.length >= 4 && pathParts[2] === postSlug) {
          // This image is already in our organized structure, check if it exists locally
          const localPath = path.join(OUT_IMG, ...pathParts.slice(2));
          if (fs.existsSync(localPath)) {
            // File already exists, just use the existing path
            manifest[u] = url.pathname;
            continue;
          }

          // Check if there's a similar file without hash suffix
          const postDir = path.join(OUT_IMG, postSlug);
          if (fs.existsSync(postDir)) {
            const requestedFile = path.basename(url.pathname);
            const files = fs.readdirSync(postDir);

            // Try to find a matching file by removing hash suffix pattern
            const baseName = requestedFile.replace(/-[a-f0-9]{8}(\.[^.]+)$/, '$1');
            const matchingFile = files.find(f => f === baseName);

            if (matchingFile) {
              manifest[u] = `/img/${postSlug}/${matchingFile}`;
              continue;
            }
          }

          // Try alternative directory names (in case of manual organization)
          const alternativeDirs = [
            postSlug.replace(/-/g, ''),
            postSlug.split('-')[0],
            postSlug.split('-').slice(-1)[0],
          ];

          for (const altSlug of alternativeDirs) {
            const altDir = path.join(OUT_IMG, altSlug);
            if (fs.existsSync(altDir)) {
              const requestedFile = path.basename(url.pathname);
              const files = fs.readdirSync(altDir);

              // Try exact match first
              if (files.includes(requestedFile)) {
                manifest[u] = `/img/${altSlug}/${requestedFile}`;
                continue;
              }

              // Try removing hash suffix
              const baseName = requestedFile.replace(/-[a-f0-9]{8}(\.[^.]+)$/, '$1');
              const matchingFile = files.find(f => f === baseName);

              if (matchingFile) {
                manifest[u] = `/img/${altSlug}/${matchingFile}`;
                continue;
              }
            }
          }
        }
      }

      const buf = await download(u);
      const hash = sha1(buf).slice(0,16);
      const ext = extFrom(u);

      // Organize images by post slug if provided
      if (postSlug) {
        const postDir = path.join(OUT_IMG, postSlug);
        fs.mkdirSync(postDir, { recursive: true });

        // Try to use a meaningful filename from the URL, fallback to hash
        const urlPath = url.pathname;
        const originalName = path.basename(urlPath, path.extname(urlPath));
        const cleanName = originalName.replace(/[^a-z0-9-]/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');

        let fname: string;
        let dest: string;

        // If we have a clean name and it's not just numbers/hash, use it
        if (cleanName && cleanName.length > 3 && !/^[0-9a-f]+$/.test(cleanName)) {
          fname = `${cleanName}.${ext}`;
          dest = path.join(postDir, fname);

          // If file exists with this name, append hash
          if (fs.existsSync(dest)) {
            fname = `${cleanName}-${hash.slice(0,8)}.${ext}`;
            dest = path.join(postDir, fname);
          }
        } else {
          // Fallback to hash-based naming
          fname = `${hash}.${ext}`;
          dest = path.join(postDir, fname);
        }

        if (!fs.existsSync(dest)) await fsp.writeFile(dest, buf);
        manifest[u] = `/img/${postSlug}/${fname}`;
      } else {
        // Fallback to old behavior for backward compatibility
        const fname = `${hash}.${ext}`;
        const dest = path.join(OUT_IMG, fname);
        if (!fs.existsSync(dest)) await fsp.writeFile(dest, buf);
        manifest[u] = `/img/${fname}`;
      }
    } catch (e:any) {
      console.error('img fail:', u, e?.message || String(e));
    }
  }
  const rewrite = (s: string) => s.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (_m,a,src,b) => manifest[src] ? `${a}${manifest[src]}${b}` : _m);
  return {
    html: html ? rewrite(html) : html,
    feature: feature && manifest[feature] ? manifest[feature] : feature ?? null,
  };
}

interface GhostPage {
  id: string;
  slug: string;
  title: string;
  html?: string;
  lexical?: string;
  excerpt?: string;
  custom_excerpt?: string;
  feature_image?: string|null;
  published_at?: string|null;
  updated_at?: string|null;
  status?: 'draft' | 'published';
}

interface GhostTag { slug: string }
interface GhostPost {
  id: string;
  slug: string;
  title: string;
  html?: string;
  lexical?: string;
  excerpt?: string;
  custom_excerpt?: string;
  feature_image?: string|null;
  published_at?: string|null;
  updated_at?: string|null;
  status?: 'draft' | 'published';
  tags?: GhostTag[]
}

// Determine output directory for a post based on its tags
function getPostOutputDir(tags?: GhostTag[]): string {
  if (!tags || tags.length === 0) {
    return OUT_BLOG; // Default to blog directory
  }

  // Look for known directory tags (excluding common tags like 'blog')
  const directoryTags = tags.filter(tag =>
    tag.slug &&
    !['blog'].includes(tag.slug) &&
    // Only use tags that look like directory names (simple alphanumeric)
    /^[a-z0-9-]+$/.test(tag.slug)
  );

  if (directoryTags.length > 0) {
    // Use the first directory tag found
    const dirTag = directoryTags[0].slug;
    const targetDir = path.join(OUT_CONTENT, dirTag);
    fs.mkdirSync(targetDir, { recursive: true });
    return targetDir;
  }

  return OUT_BLOG; // Default fallback
}

const api = new (GhostAdminAPI as any)({
  url: GHOST_URL,
  key: GHOST_ADMIN_KEY,
  version: 'v6.0'
});

async function fetchAllPosts(): Promise<GhostPost[]> {
  const allPosts: GhostPost[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await api.posts.browse({
        limit: 50,
        page: page,
        include: 'tags,authors',
        formats: ['html', 'lexical']
      });

      const posts = response || [];
      allPosts.push(...posts);

      // Check if there are more pages
      hasMore = posts.length === 50;
      page++;
    } catch (error) {
      console.error(`Error fetching posts on page ${page}:`, error);
      break;
    }
  }

  return allPosts;
}

async function fetchAllPages(): Promise<GhostPage[]> {
  const allPages: GhostPage[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await (api as any).pages.browse({
        limit: 50,
        page: page,
        formats: ['html', 'lexical']
      });

      const pages = response || [];
      allPages.push(...pages);

      // Check if there are more pages
      hasMore = pages.length === 50;
      page++;
    } catch (error) {
      console.error(`Error fetching pages on page ${page}:`, error);
      break;
    }
  }

  return allPages;
}

(async () => {
  const nhm = new NodeHtmlMarkdown({
    bulletMarker: '-',
  });
  const exportType = process.argv[2] || 'all'; // posts, pages, or all

  let posts: GhostPost[] = [];
  let pages: GhostPage[] = [];

  if (exportType === 'posts' || exportType === 'all') {
    posts = await fetchAllPosts();
  }

  if (exportType === 'pages' || exportType === 'all') {
    pages = await fetchAllPages();
  }

  let changed = 0;

  // Process posts (to content/blog/)
  for (const p of posts) {
    // Process lexical content first to extract videos and preserved markdown
    const { videos, markdownBlocks } = processLexicalContent(p.lexical);

    // We ignore tags and pages; everything from Ghost is a blog post
    const { html, feature } = await downloadAndRewriteImages(p.html, p.feature_image, p.slug, videos);

    // Pre-process Ghost HTML to handle special elements, then convert to markdown
    const { html: preprocessedHtml, placeholders } = html ? preprocessGhostHtml(html) : { html: '', placeholders: {} };
    let mdBody = preprocessedHtml ? nhm.translate(preprocessedHtml) : '';

    // Restore placeholders after markdown conversion
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Add standalone videos from lexical as markdown (but skip if they're already in preserved markdown blocks)
    videos.forEach((video, index) => {
      // Check if this video is already part of a preserved markdown block
      const isInMarkdownBlock = markdownBlocks.some(block =>
        block.includes(video.src) || block.includes(`<video src="${video.src}"`)
      );

      if (!isInMarkdownBlock) {
        const videoPlaceholder = `LEXICALVIDEO${index}`;
        const videoMarkdown = video.caption
          ? `![${video.alt}](${video.src})\n^^^ ${video.caption}`
          : `![${video.alt}](${video.src})`;

        // Add video placeholder to placeholders for restoration
        placeholders[videoPlaceholder] = videoMarkdown;
        mdBody += `\n\n${videoPlaceholder}\n`;
      }
    });

    // Restore all placeholders including the preserved markdown
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Remove any remaining fenced markdown code blocks that weren't replaced
    mdBody = mdBody.replace(/```markdown\n([\s\S]*?)\n```/g, '$1');

    // Post-process to fix NodeHtmlMarkdown's quirks
    let fixedMdBody = mdBody
      // Fix URL encoding of underscores (NodeHtmlMarkdown encodes them)
      .replace(/%5F/g, '_')
      // Fix escaped periods after numbers (NodeHtmlMarkdown escodes them)
      .replace(/(\d)\\\./g, '$1.')
      .replace(/\\-/g, '-')
      .replace(/https?:\/\/ghost\.burwal\.de\//g, '/');

    // Extract custom front matter from HTML comments and remove them from content
    let extractedCustomFields = {};
    fixedMdBody = fixedMdBody.replace(/<!-- CUSTOM_FRONT_MATTER:(.+?) -->\s*/g, (match, jsonStr) => {
      try {
        const customFields = JSON.parse(jsonStr);
        extractedCustomFields = { ...extractedCustomFields, ...customFields };
      } catch (e) {
        console.warn(`Failed to parse custom front matter for ${p.slug}:`, e);
      }
      return ''; // Remove the comment from the content
    });

    // Read existing front matter to preserve custom fields
    let existingFrontMatter = {};
    const outputDir = getPostOutputDir(p.tags);
    const outPath = path.join(outputDir, `${p.slug}.md`);
    if (fs.existsSync(outPath)) {
      try {
        const existingContent = await fsp.readFile(outPath, 'utf8');
        const existingMatter = matter(existingContent);
        existingFrontMatter = existingMatter.data || {};
      } catch (e) {
        console.warn(`Could not read existing front matter for ${p.slug}:`, e);
      }
    }

    const fm = {
      title: p.title,
      slug: p.slug,
      ...(p.published_at ? { date: p.published_at } : {}),
      ...(p.updated_at ? { updated: p.updated_at } : {}),
      excerpt: p.custom_excerpt || "",
      ...(feature ? { feature_image: feature } : {}),
      ...(p.tags && p.tags.length > 0 ? { tags: p.tags.map(tag => tag.slug) } : {}),
      published: p.status === 'published',
      // First include custom fields extracted from Ghost content
      ...extractedCustomFields,
      // Then include existing custom fields from filesystem (these take precedence)
      ...Object.keys(existingFrontMatter).reduce((acc, key) => {
        if (!['title', 'slug', 'date', 'updated', 'excerpt', 'feature_image', 'tags', 'published'].includes(key)) {
          acc[key] = existingFrontMatter[key];
        }
        return acc;
      }, {} as Record<string, any>),
    } as const;

    const file = matter.stringify(fixedMdBody.trim() + '\n', fm as any);

    const prev = fs.existsSync(outPath) ? await fsp.readFile(outPath, 'utf8') : '';
    if (prev !== file) { await fsp.writeFile(outPath, file); changed++; }
  }

  // Process pages (to content/ root)
  for (const p of pages) {
    // Process lexical content first to extract videos and preserved markdown
    const { videos, markdownBlocks } = processLexicalContent(p.lexical);

    const { html, feature } = await downloadAndRewriteImages(p.html, p.feature_image, p.slug, videos);

    // Pre-process Ghost HTML to handle special elements, then convert to markdown
    const { html: preprocessedHtml, placeholders } = html ? preprocessGhostHtml(html) : { html: '', placeholders: {} };
    let mdBody = preprocessedHtml ? nhm.translate(preprocessedHtml) : '';

    // Restore placeholders after markdown conversion
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Add standalone videos from lexical as markdown (but skip if they're already in preserved markdown blocks)
    videos.forEach((video, index) => {
      // Check if this video is already part of a preserved markdown block
      const isInMarkdownBlock = markdownBlocks.some(block =>
        block.includes(video.src) || block.includes(`<video src="${video.src}"`)
      );

      if (!isInMarkdownBlock) {
        const videoPlaceholder = `LEXICALVIDEO${index}`;
        const videoMarkdown = video.caption
          ? `![${video.alt}](${video.src})\n^^^ ${video.caption}`
          : `![${video.alt}](${video.src})`;

        // Add video placeholder to placeholders for restoration
        placeholders[videoPlaceholder] = videoMarkdown;
        mdBody += `\n\n${videoPlaceholder}\n`;
      }
    });

    // Restore all placeholders including the preserved markdown
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Remove any remaining fenced markdown code blocks that weren't replaced
    mdBody = mdBody.replace(/```markdown\n([\s\S]*?)\n```/g, '$1');

    // Post-process to fix NodeHtmlMarkdown's quirks
    let fixedMdBody = mdBody
      // Fix URL encoding of underscores (NodeHtmlMarkdown encodes them)
      .replace(/%5F/g, '_')
      // Fix escaped periods after numbers (NodeHtmlMarkdown escapes them)
      .replace(/(\d)\\\./g, '$1.')
      .replace(/\\-/g, '-')
      .replace(/https?:\/\/ghost\.burwal\.de\//g, '/');

    // Extract custom front matter from HTML comments and remove them from content
    let extractedCustomFields = {};
    fixedMdBody = fixedMdBody.replace(/<!-- CUSTOM_FRONT_MATTER:(.+?) -->\s*/g, (match, jsonStr) => {
      try {
        const customFields = JSON.parse(jsonStr);
        extractedCustomFields = { ...extractedCustomFields, ...customFields };
      } catch (e) {
        console.warn(`Failed to parse custom front matter for ${p.slug}:`, e);
      }
      return ''; // Remove the comment from the content
    });

    // Read existing front matter to preserve custom fields
    let existingFrontMatter = {};
    const outPath = path.join(OUT_CONTENT, `${p.slug}.md`);
    if (fs.existsSync(outPath)) {
      try {
        const existingContent = await fsp.readFile(outPath, 'utf8');
        const existingMatter = matter(existingContent);
        existingFrontMatter = existingMatter.data || {};
      } catch (e) {
        console.warn(`Could not read existing front matter for ${p.slug}:`, e);
      }
    }

    const fm = {
      title: p.title,
      slug: p.slug,
      ...(p.published_at ? { date: p.published_at } : {}),
      ...(p.updated_at ? { updated: p.updated_at } : {}),
      excerpt: p.custom_excerpt || "",
      ...(feature ? { feature_image: feature } : {}),
      published: p.status === 'published',
      // First include custom fields extracted from Ghost content
      ...extractedCustomFields,
      // Then include existing custom fields from filesystem (these take precedence)
      ...Object.keys(existingFrontMatter).reduce((acc, key) => {
        if (!['title', 'slug', 'date', 'updated', 'excerpt', 'feature_image', 'published'].includes(key)) {
          acc[key] = existingFrontMatter[key];
        }
        return acc;
      }, {} as Record<string, any>),
    } as const;

    const file = matter.stringify(fixedMdBody.trim() + '\n', fm as any);

    const prev = fs.existsSync(outPath) ? await fsp.readFile(outPath, 'utf8') : '';
    if (prev !== file) { await fsp.writeFile(outPath, file); changed++; }
  }

  const totalPosts = posts.length;
  const totalPages = pages.length;
  const publishedPosts = posts.filter(p => p.status === 'published').length;
  const publishedPages = pages.filter(p => p.status === 'published').length;

  console.log(`Exported ${changed} changed files`);
  if (totalPosts > 0) {
    console.log(`Posts processed: ${totalPosts} (${publishedPosts} published) → content/blog/`);
  }
  if (totalPages > 0) {
    console.log(`Pages processed: ${totalPages} (${publishedPages} published) → content/`);
  }
})().catch(err => { console.error(err); process.exit(1); });
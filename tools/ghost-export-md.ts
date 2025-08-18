#!/usr/bin/env bun
/**
 * Export Ghost posts → Markdown for content/blog only.
 * - Uses Ghost ADMIN API (includes draft posts)
 * - Downloads referenced images to public/img/<post-slug>/ (organized by post)
 * - Rewrites <img> src and feature_image to /img/<post-slug>/<filename>
 * - Writes files to content/blog/<slug>.md with YAML front‑matter
 * - Properly handles draft/published status
 * - Uses meaningful filenames when possible, falls back to hash
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

// ---- helpers ----
const sha1 = (buf: Uint8Array | string) => crypto.createHash('sha1').update(buf).digest('hex');

// Pre-process Ghost HTML to handle special elements before markdown conversion
function preprocessGhostHtml(html: string): { html: string; placeholders: Record<string, string> } {
  const doc = parse(html);
  const nhm = new NodeHtmlMarkdown();
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

  return { html: doc.toString(), placeholders };
}

function extFrom(u: string, def = 'jpg') {
  try {
    const m = new URL(u).pathname.match(/\.(avif|webp|png|jpe?g|gif|bmp|svg)$/i);
    return (m ? m[1].toLowerCase() : def).replace('jpeg','jpg');
  } catch { return def; }
}

async function download(u: string): Promise<Uint8Array> {
  const r = await fetch(u, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  return new Uint8Array(await r.arrayBuffer());
}
function collectImageUrls(html?: string, feature?: string | null) {
  const urls = new Set<string>();
  if (feature && /^https?:\/\//.test(feature)) urls.add(feature);
  if (!html) return [...urls];
  const root = parse(html);
  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && /^https?:\/\//.test(src)) urls.add(src);
  });
  return [...urls];
}
async function downloadAndRewriteImages(html?: string, feature?: string | null, postSlug?: string) {
  const manifest: Record<string,string> = {};
  for (const u of collectImageUrls(html, feature)) {
    try {
      const url = new URL(u);

      // Check if this is already pointing to our organized structure
      if (url.hostname === 'jwie.be' && url.pathname.startsWith('/img/') && postSlug) {
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
            // Handle specific cases like vercel-og for using-vercel-og-without-nextjs
            ...(postSlug.includes('vercel-og') ? ['vercel-og'] : []),
            ...(postSlug.includes('keychron') ? ['keychron-k3'] : [])
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

// ---- fetch posts only ----
interface GhostTag { slug: string }
interface GhostPost {
  id: string;
  slug: string;
  title: string;
  html?: string;
  excerpt?: string;
  custom_excerpt?: string;
  feature_image?: string|null;
  published_at?: string|null;
  updated_at?: string|null;
  status?: 'draft' | 'published';
  tags?: GhostTag[]
}
interface BrowseResp { posts: GhostPost[]; meta: any }

// Initialize Ghost Admin API
const api = new GhostAdminAPI({
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
      const response = await (api as any).posts.browse({
        limit: 50,
        page: page,
        include: 'tags,authors',
        formats: ['html']
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

(async () => {
  const nhm = new NodeHtmlMarkdown();
  const posts = await fetchAllPosts();
  let changed = 0;

  for (const p of posts) {
    // We ignore tags and pages; everything from Ghost is a blog post
    const { html, feature } = await downloadAndRewriteImages(p.html, p.feature_image, p.slug);

    // Pre-process Ghost HTML to handle special elements, then convert to markdown
    const { html: preprocessedHtml, placeholders } = html ? preprocessGhostHtml(html) : { html: '', placeholders: {} };
    let mdBody = preprocessedHtml ? nhm.translate(preprocessedHtml) : '';

    // Restore placeholders after markdown conversion
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Post-process to fix escaped markdown and clean up formatting
    const fixedMdBody = mdBody
      // Fix escaped markdown
      .replace(/!\\?\[([^\]]*)\]\\?\(([^)]+)\)/g, '![$1]($2)')
      // Fix escaped brackets and parentheses
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')');
    const fm = {
      title: p.title,
      slug: p.slug,
      date: p.published_at || undefined,
      updated: p.updated_at || undefined,
      excerpt: p.custom_excerpt || "",
      feature_image: feature || null,
      published: p.status === 'published',
    } as const;

    const outPath = path.join(OUT_BLOG, `${p.slug}.md`);

    const file = matter.stringify(fixedMdBody.trim() + '\n', fm as any);

    const prev = fs.existsSync(outPath) ? await fsp.readFile(outPath, 'utf8') : '';
    if (prev !== file) { await fsp.writeFile(outPath, file); changed++; }
  }

  const totalPosts = posts.length;
  const published = posts.filter(p => p.status === 'published').length;

  console.log(`Exported ${changed} changed files to content/blog`);
  console.log(`Total posts processed: ${totalPosts} (${published} published)`);
})().catch(err => { console.error(err); process.exit(1); });
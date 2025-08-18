#!/usr/bin/env bun
/**
 * Import Markdown files into Ghost via Admin API.
 * - Reads .md with YAML front-matter
 * - Converts to HTML
 * - Upserts by slug (edit if exists, else add)
 * - Shows full Ghost error payloads
 *
 * Env:
 *   GHOST_URL=https://ghost.your-domain.tld
 *   GHOST_ADMIN_KEY=<admin api key from Integrations>
 *
 * Usage:
 *   bun tools/import-md-to-ghost.ts content
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { htmlToLexical } from "@tryghost/kg-html-to-lexical";
import GhostAdminAPI from "@tryghost/admin-api";

const GHOST_URL = process.env.GHOST_URL;
const GHOST_ADMIN_KEY = process.env.GHOST_ADMIN_KEY;

const SITE_BASE = process.env.SITE_BASE || "https://jwie.be"; // used to absolutize /img/... for Ghost editor

function convertMarkdownCaptions(text: string): string {
  // Use micromark for better markdown support in captions (links, bold, italic, etc.)
  const html = micromark(text, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()]
  });
  // Remove wrapping <p> tags for inline use
  return html.replace(/^<p>|<\/p>\s*$/g, '');
}

function cleanStandaloneCarets(md: string) {
  // Remove standalone ^^^ lines that aren't image captions
  return md.replace(/^\^\^\^\s*$/gm, '');
}

function mdCaptionToFigure(md: string) {
  // Convert ![alt](src)\n^^^ caption to <figure><img /><figcaption>... or <figure><video /><figcaption>...
  // But skip content inside markdown code blocks
  return md.replace(
    /```markdown\n([\s\S]*?)\n```|!\[([^\]]*)\]\(([^)\s]+)\)\s*\n\^\^\^\s*([^\n]+)/g,
    (match, codeContent, alt, src, cap) => {
      // If this is a markdown code block, return it unchanged
      if (codeContent !== undefined) {
        return match;
      }
      
      // Otherwise process the image/video caption
      const isVideo = /\.(mp4|webm|mov)$/i.test(src);
      if (isVideo) {
        return `<figure><video src="${src}" controls></video><figcaption>${convertMarkdownCaptions(cap)}</figcaption></figure>`;
      } else {
        return `<figure><img alt="${alt}" src="${src}" /><figcaption>${convertMarkdownCaptions(cap)}</figcaption></figure>`;
      }
    }
  );
}

function imageHalf(md: string) {
  // :::image-half \n ![...](...) \n ^^^ caption \n ![...](...) \n ^^^ caption \n :::
  return md.replace(
    /:::image-half\s*\n([\s\S]*?)\n:::/g,
    (_m, content) => {
      // Check if content contains video elements or video file references
      const hasVideo = content.includes('<video') || /!\[[^\]]*\]\([^)]*\.(mp4|webm|mov)\)/i.test(content);
      
      if (hasVideo) {
        // Preserve as markdown block if videos are detected
        return `\`\`\`markdown\n:::image-half\n${content}\n:::\n\`\`\``;
      }

      const images: { src: string; alt: string; caption?: string }[] = [];
      
      // Split content into lines and process
      const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line is an image
        const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgMatch) {
          const [, alt, src] = imgMatch;
          
          // Check if the next line is a caption (starts with ^^^)
          const nextLine = lines[i + 1];
          let caption: string | undefined;
          
          if (nextLine && nextLine.startsWith('^^^')) {
            caption = convertMarkdownCaptions(nextLine.replace(/^\^\^\^\s*/, ''));
            i++; // Skip the caption line since we've processed it
          }
          
          images.push({ src, alt, caption });
        }
        // Skip standalone ^^^ lines that aren't image captions
      }

      if (images.length === 0) return _m; // Return original if no images found

      // Create Ghost gallery card HTML structure
      const galleryImages = images.map(img =>
        `<div class="kg-gallery-image">
          <img src="${img.src}" width="1200" height="800" loading="lazy" alt="${img.alt}" />
        </div>`
      ).join('\n        ');

      // Combine all captions for overall gallery caption
      const galleryCaption = images.map(img => img.caption).filter(Boolean).join(' | ');

      return `<figure class="kg-card kg-gallery-card kg-width-wide">
  <div class="kg-gallery-container">
    <div class="kg-gallery-row">
        ${galleryImages}
    </div>
  </div>${galleryCaption ? `\n  <figcaption>${galleryCaption}</figcaption>` : ''}
</figure>`;
    }
  );
}

function absolutizeImgs(html: string) {
  // Handle img src attributes
  html = html.replace(/(<img[^>]+src=["'])(\/img\/[^"']+)(["'])/gi, (_m, a, src, b) => `${a}${SITE_BASE}${src}${b}`);
  // Handle video source src attributes
  html = html.replace(/(<source[^>]+src=["'])(\/img\/[^"']+)(["'])/gi, (_m, a, src, b) => `${a}${SITE_BASE}${src}${b}`);
  // Handle video src attributes
  html = html.replace(/(<video[^>]+src=["'])(\/img\/[^"']+)(["'])/gi, (_m, a, src, b) => `${a}${SITE_BASE}${src}${b}`);
  return html;
}

function convertVideoImagesToVideoBlocks(lexicalObj: any) {
  function processNode(node: any) {
    // Convert image blocks with video file extensions to video blocks
    if (node.type === 'image' && node.src && /\.(mp4|webm|mov)$/i.test(node.src)) {
      // Extract filename from URL
      const filename = node.src.split('/').pop() || '';
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      
      // Convert to video block
      node.type = 'video';
      node.fileName = filename;
      node.mimeType = extension === 'mp4' ? 'video/mp4' : 
                     extension === 'webm' ? 'video/webm' : 
                     extension === 'mov' ? 'video/quicktime' : 'video/mp4';
      
      // Set default video properties (Ghost will handle these on the frontend)
      node.width = node.width || 1920;
      node.height = node.height || 1080;
      node.duration = 0; // Unknown duration
      node.thumbnailSrc = ''; // No thumbnail
      node.customThumbnailSrc = '';
      node.thumbnailWidth = node.width;
      node.thumbnailHeight = node.height;
      node.cardWidth = node.cardWidth || 'regular';
      node.loop = false;
      
      // Keep existing caption if present
      node.caption = node.caption || '';
    }
    
    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(processNode);
    }
  }
  
  if (lexicalObj?.root?.children) {
    lexicalObj.root.children.forEach(processNode);
  }
}

if (!GHOST_URL || !GHOST_ADMIN_KEY) {
  console.error("Set GHOST_URL and GHOST_ADMIN_KEY");
  process.exit(1);
}

const api = new GhostAdminAPI({
  url: GHOST_URL,
  key: GHOST_ADMIN_KEY,
  version: "v6.0",
});

function listMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (name.toLowerCase() === 'index.md') continue;
    else if (name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

type FrontMatter = {
  title?: string;
  slug?: string;
  date?: string;
  updated?: string;
  tags?: string[] | { name: string }[];
  excerpt?: string;
  feature_image?: string;
  canonical_url?: string;
  published?: boolean;
};

function classifyByPath(file: string): { kind: 'post' | 'page'; folder?: string } {
  const rel = path.relative(process.cwd(), file);
  const parts = rel.split(path.sep);
  const idx = parts.indexOf('content');
  if (idx === -1) return { kind: 'page' };
  const after = parts.slice(idx + 1);
  // content/<slug>.md => page (top-level)
  if (after.length === 1) return { kind: 'page' };
  // content/<folder>/... => post in <folder>
  return { kind: 'post', folder: after[0] };
}

async function upsertPostOrPage(file: string) {
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  const fm = data as FrontMatter;

  const title = String(fm.title ?? path.basename(file, '.md'));
  const slug = String(fm.slug ?? path.basename(file, '.md')).trim().toLowerCase();
  let md = content;
  md = cleanStandaloneCarets(md);
  md = imageHalf(md);
  md = mdCaptionToFigure(md);
  const htmlRaw = micromark(md, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
    allowDangerousHtml: true,
  });
  const html = absolutizeImgs(htmlRaw);

  // Convert HTML to Lexical format and stringify for Ghost API
  const lexicalObj = htmlToLexical(html);

  // Validate lexical structure
  if (!lexicalObj?.root?.children) {
    console.error(`Invalid lexical structure for ${file}`);
    return;
  }

  // Post-process lexical to convert image blocks with video files to video blocks
  convertVideoImagesToVideoBlocks(lexicalObj);

  const lexical = JSON.stringify(lexicalObj);

  const tags = Array.isArray(fm.tags)
    ? (fm.tags as any[]).map(t => (typeof t === 'string' ? { name: t } : t))
    : undefined;

  const { kind, folder } = classifyByPath(file);
  const status: 'draft' | 'published' = fm.published ? 'published' : 'draft';
  const published_at = fm.date ? new Date(fm.date).toISOString() : undefined;

  // For posts under content/<folder>, add folder tag unless folder is 'blog'
  const finalTags = kind === 'post' && folder && folder !== 'blog'
    ? [ ...(tags || []), { name: folder } ]
    : tags;

  if (kind === 'post') {
    // Posts
    try {
      const existing = await api.posts.read({ slug });
      await api.posts.edit({
        id: existing.id,
        title,
        slug,
        lexical,
        tags: finalTags,
        feature_image: fm.feature_image,
        canonical_url: fm.canonical_url,
        custom_excerpt: fm.excerpt || "",
        status,
        updated_at: existing.updated_at,
        ...(published_at ? { published_at } : {}),
      });
      console.log(`Updated post: ${slug}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || /not found/i.test(String(err))) {
        try {
          await api.posts.add({
            title,
            slug,
            lexical,
            tags: finalTags,
            custom_excerpt: fm.excerpt || "",
            feature_image: fm.feature_image,
            canonical_url: fm.canonical_url,
            status,
            ...(published_at ? { published_at } : {}),
          });
          console.log(`Created post: ${slug}`);
        } catch (e: any) {
          dumpGhostError('ADD_POST', slug, e);
          throw e;
        }
      } else {
        dumpGhostError('READ_POST', slug, err);
        throw err;
      }
    }
  } else {
    // Pages
    try {
      const existing = await (api as any).pages.read({ slug });
      await (api as any).pages.edit({
        id: existing.id,
        title,
        slug,
        lexical,
        feature_image: fm.feature_image,
        canonical_url: fm.canonical_url,
        status,
        updated_at: existing.updated_at,
        ...(published_at ? { published_at } : {}),
      });
      console.log(`Updated page: ${slug}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || /not found/i.test(String(err))) {
        try {
          await (api as any).pages.add({
            title,
            slug,
            lexical,
            feature_image: fm.feature_image,
            canonical_url: fm.canonical_url,
            status,
            ...(published_at ? { published_at } : {}),
          });
          console.log(`Created page: ${slug}`);
        } catch (e: any) {
          dumpGhostError('ADD_PAGE', slug, e);
          throw e;
        }
      } else {
        dumpGhostError('READ_PAGE', slug, err);
        throw err;
      }
    }
  }
}

function dumpGhostError(stage: string, slug: string, e: any) {
  const payload =
    e?.response?.data ?? e?.errors ?? e?.message ?? JSON.stringify(e, null, 2);
  console.error(`Ghost error during ${stage} for ${slug}:`);

  // Enhanced error logging
  if (e?.response) {
    console.error(`Status: ${e.response.status}`);
    console.error(`Status Text: ${e.response.statusText}`);
    if (e.response.data) {
      console.error(`Response data:`, JSON.stringify(e.response.data, null, 2));
    }
  }

  try {
    console.error(
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)
    );
  } catch {
    console.error(payload);
  }
}

(async () => {
  const roots = process.argv.slice(2);
  if (!roots.length) {
    console.error("Usage: bun tools/import-md-to-ghost.ts <content_dir> [...]");
    process.exit(1);
  }
  const files = roots.flatMap(listMarkdownFiles);
  if (!files.length) {
    console.log("No markdown files found.");
    process.exit(0);
  }
  for (const f of files) {
    try {
      await upsertPostOrPage(f);
    } catch {
      // error already printed with context
    }
  }
})();
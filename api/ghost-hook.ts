// api/ghost-hook.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(200).end("ok");

  // Optional: verify Ghost signature here if you set one on the webhook
  const repo = process.env.GH_REPO; // e.g. "josiahwiebe/jwie.be"
  const token = process.env.GH_TOKEN; // fine-grained PAT with repo:actions:write
  if (!repo || !token) return res.status(500).send("missing GH_REPO/GH_TOKEN");

  const r = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `token ${token}`,
      "User-Agent": "ghost-webhook",
    },
    body: JSON.stringify({ event_type: "ghost-publish" }),
  });

  return res.status(r.ok ? 200 : 500).end(r.statusText);
}
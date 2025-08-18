export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).end("ok");

  try {
    const repo = process.env.GH_REPO;
    const token = process.env.GH_TOKEN;
    if (!repo || !token) return res.status(500).send("missing GH_REPO/GH_TOKEN");

    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/sync-blog.yml/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "ghost-webhook",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ event_type: "ghost-publish" }),
    });

    return res.status(200).end("webhook sent");
  } catch (e) {
    console.error(e);

    return res.status(500).send("error handling webhook");
  }


}
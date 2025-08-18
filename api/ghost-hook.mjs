export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const repo = process.env.GH_REPO;
    const token = process.env.GH_TOKEN;
    if (!repo || !token) {
      return res.status(500).json({ error: "Missing GH_REPO or GH_TOKEN environment variables" });
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/sync-blog.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'vercel-webhook' // GitHub likes this
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          event_type: 'ghost-publish'
        }
      })
    });

    if (response.status === 204) {
      console.log('Workflow triggered successfully');
      return res.status(200).json({ success: true, message: "Workflow triggered" });
    } else {
      const errText = await response.text();
      console.error('GitHub API error:', response.status, errText);
      throw new Error(`GitHub API returned ${response.status}: ${errText}`);
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return res.status(500).json({ error: error.message });
  }
}

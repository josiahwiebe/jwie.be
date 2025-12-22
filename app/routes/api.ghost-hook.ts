import type { ActionFunctionArgs } from 'react-router'

/**
 * Ghost CMS webhook handler
 * Triggers GitHub Actions workflow when Ghost publishes content
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const repo = process.env.GH_REPO
    const token = process.env.GH_TOKEN
    const secret = process.env.GH_DEPLOY_SECRET

    if (!repo || !token) {
      return Response.json(
        { error: 'Missing GH_REPO or GH_TOKEN environment variables' },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    if (url.searchParams.get('secret') !== secret) {
      return Response.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/sync-blog.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'vercel-webhook',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { event_type: 'ghost-publish' },
        }),
      }
    )

    if (response.status === 204) {
      console.log('Workflow triggered successfully')
      return Response.json({ success: true, message: 'Workflow triggered' })
    }

    const errText = await response.text()
    console.error('GitHub API error:', response.status, errText)
    throw new Error(`GitHub API returned ${response.status}: ${errText}`)
  } catch (error) {
    console.error('Error triggering workflow:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

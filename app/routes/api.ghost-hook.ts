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
    const workflowId = process.env.GH_WORKFLOW_ID || 'sync-blog.yml'
    const ref = process.env.GH_REF || 'main'

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

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'vercel-webhook',
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref,
          inputs: { event_type: 'ghost-publish' },
        }),
      }
    )

    if (response.status === 204) {
      console.log('Workflow triggered successfully')
      return Response.json({ success: true, message: 'Workflow triggered' })
    }

    const errText = await response.text()
    console.error('GitHub workflow_dispatch error:', response.status, errText)

    if (response.status >= 500) {
      const fallbackResponse = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'ghost-publish',
          client_payload: { source: 'ghost-hook' },
        }),
      })

      if (fallbackResponse.status === 204) {
        console.log('Repository dispatch fallback triggered successfully')
        return Response.json({ success: true, message: 'Repository dispatch fallback triggered' })
      }

      const fallbackErrText = await fallbackResponse.text()
      console.error('GitHub repository_dispatch fallback error:', fallbackResponse.status, fallbackErrText)
      throw new Error(
        `workflow_dispatch failed (${response.status}) and repository_dispatch fallback failed (${fallbackResponse.status}): ${fallbackErrText}`
      )
    }

    throw new Error(`GitHub API returned ${response.status}: ${errText}`)
  } catch (error) {
    console.error('Error triggering workflow:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

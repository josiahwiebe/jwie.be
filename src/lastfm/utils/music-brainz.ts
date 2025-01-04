let lastRequestTime = 0
const RATE_LIMIT_MS = 1000 // 1 second

interface Recording {
  id: string
  title: string
  length: number
}

export async function searchMusicBrainz(artist: string, track: string): Promise<Recording[]> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()

  const query = `recording:"${track}" AND artist:"${artist}"`
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'jwie.be Listening Stats (https://jwie.be/playground/lastfm)',
      },
    })
    if (!response.ok) {
      throw new Error('MusicBrainz search failed')
    }
    const data = await response.json()
    return data.recordings.map((recording: any) => ({
      id: recording.id,
      title: recording.title,
      length: recording.length || 0,
    }))
  } catch (error) {
    console.error('Error fetching from MusicBrainz:', error)
    return []
  }
}

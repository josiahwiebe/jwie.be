import type { MusicBrainzRecording } from '../types'

let lastRequestTime = 0
const RATE_LIMIT_MS = 1000 // 1 second

export async function searchMusicBrainz(
  artist: string,
  track: string,
  trackMbid?: string,
  artistMbid?: string
): Promise<MusicBrainzRecording[]> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()

  let url: string
  if (trackMbid) {
    // If track MBID is provided, look up directly
    url = `https://musicbrainz.org/ws/2/recording/${trackMbid}?fmt=json`
  } else if (artistMbid) {
    // If artist MBID is provided, search by artist ID and track title
    url = `https://musicbrainz.org/ws/2/recording/?artist=${artistMbid}&query="${track}"&fmt=json`
  } else {
    // Fall back to searching by artist name and track title
    const query = `recording:"${track}" AND artist:"${artist}"`
    url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`
  }

  console.log('params', { artist, track, trackMbid, artistMbid })

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

    if (trackMbid) {
      // Single recording lookup returns a single recording object
      return [
        {
          id: data.id,
          title: data.title,
          length: data.length || 0,
          artist: {
            '#text': data.artist?.[0]?.name || artist,
            mbid: data.artist?.[0]?.id || artistMbid || '',
          },
          album: {
            '#text': data.releases?.[0]?.title || '',
            mbid: data.releases?.[0]?.id || '',
          },
        },
      ]
    } else {
      // Search returns an array of recordings
      return data.recordings.map((recording: any) => ({
        id: recording.id,
        title: recording.title,
        length: recording.length || 0,
        artist: {
          '#text': recording.artist?.[0]?.name || artist,
          mbid: recording.artist?.[0]?.id || artistMbid || '',
        },
        album: {
          '#text': recording.releases?.[0]?.title || '',
          mbid: recording.releases?.[0]?.id || '',
        },
      }))
    }
  } catch (error) {
    console.error('Error fetching from MusicBrainz:', error)
    return []
  }
}

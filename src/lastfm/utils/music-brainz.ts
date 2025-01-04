interface Recording {
  id: string
  title: string
  length: number
}

export async function searchMusicBrainz(artist: string, track: string): Promise<Recording[]> {
  const query = `recording:"${track}" AND artist:"${artist}"`
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`

  try {
    const response = await fetch(url)
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

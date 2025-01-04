export interface Track {
  name: string
  artist: { '#text': string; mbid?: string }
  album: { '#text': string }
  date: { uts: string }
  mbid?: string
}

export interface ArtistStats {
  count: number
  minutes: number
  mbid: string | null
}

export interface AlbumStats {
  name: string
  artist: string
  minutes: number
  imageUrl: string
}

export interface Stats {
  totalMinutes: number
  totalTracks: number
  uniqueTracks: number
  artists: { [key: string]: ArtistStats }
  monthlyStats: { month: string; minutes: number }[]
  dailyStats: { date: string; minutes: number }[]
  topAlbums: AlbumStats[]
  unmatchedTracks: Track[]
}

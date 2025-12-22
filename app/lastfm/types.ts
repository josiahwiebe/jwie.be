export interface Track {
  name: string
  artist: { '#text': string; mbid?: string }
  album: { '#text': string }
  date: { uts: string }
  mbid?: string
  '@attr'?: { nowplaying?: string }
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

export interface TrackStats {
  name: string
  artist: string
  count: number
  minutes: number
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
  topTracks: TrackStats[]
}

export interface MusicBrainzRecording {
  id: string
  title: string
  length: number
  artist: { '#text': string; mbid: string }
  album: { '#text': string; mbid: string }
}

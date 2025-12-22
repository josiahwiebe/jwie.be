import { cache } from './cache'
import type { Track, Stats, AlbumStats, TrackStats } from '../types'
import { searchMusicBrainz } from './music-brainz'

export async function fetchStats(
  username: string,
  apiKey: string,
  fromDate: Date,
  toDate: Date,
  onProgress: (current: number, total: number, phase: 'fetching' | 'processing') => void,
  onPartialResult: (partialStats: Partial<Stats>) => void
): Promise<Stats> {
  // First phase: fetching tracks
  const tracks = await fetchTracks(username, apiKey, fromDate, toDate, (current, total) =>
    onProgress(current, total, 'fetching')
  )

  // Initialize stats
  const stats: Stats = {
    totalMinutes: 0,
    totalTracks: tracks.length,
    uniqueTracks: new Set(tracks.map((t) => `${t.artist['#text']}-${t.name}`)).size,
    artists: {},
    monthlyStats: [],
    topAlbums: [],
    unmatchedTracks: [],
    dailyStats: [],
    topTracks: [],
  }

  const albumMap = new Map<string, AlbumStats>()
  const monthlyMap = new Map<string, number>()
  const dailyMap = new Map<string, number>()
  const trackMap = new Map<string, TrackStats>()

  // Split tracks into cached and uncached
  const tracksWithCache: [Track, number | null][] = tracks.map((track) => {
    const cacheKey = `${track.artist['#text']}-${track.name}`
    return [track, cache.get(cacheKey) ?? null]
  })

  const cachedTracks = tracksWithCache.filter(([_, duration]) => duration !== null)
  const uncachedTracks = tracksWithCache.filter(([_, duration]) => duration === null).map(([track]) => track)

  // Process cached tracks first (this will be very fast)
  for (const [track, duration] of cachedTracks) {
    processTrackStats(track, duration as number, stats, albumMap, monthlyMap, dailyMap, trackMap)
    onProgress(cachedTracks.indexOf([track, duration]) + 1, tracks.length, 'processing')
  }

  // Then process uncached tracks
  for (let i = 0; i < uncachedTracks.length; i++) {
    const track = uncachedTracks[i]
    if (!track) continue
    const duration = await getTrackDuration(track, apiKey)

    if (duration === null) {
      stats.unmatchedTracks.push(track)
      continue
    }

    processTrackStats(track, duration, stats, albumMap, monthlyMap, dailyMap, trackMap)
    onProgress(cachedTracks.length + i + 1, tracks.length, 'processing')

    // Provide partial results every 10 tracks or on the last track
    if (i % 10 === 0 || i === uncachedTracks.length - 1) {
      onPartialResult({ ...stats })
    }
  }

  stats.monthlyStats = Array.from(monthlyMap.entries())
    .map(([month, minutes]) => ({ month, minutes }))
    .sort((a, b) => a.month.localeCompare(b.month))

  stats.topAlbums = Array.from(albumMap.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)

  stats.dailyStats = Array.from(dailyMap.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date))

  stats.topTracks = Array.from(trackMap.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)

  // Ensure all stats are numbers
  stats.totalMinutes = Number(stats.totalMinutes.toFixed(2))
  stats.monthlyStats.forEach((stat) => (stat.minutes = Number(stat.minutes.toFixed(2))))
  stats.dailyStats.forEach((stat) => (stat.minutes = Number(stat.minutes.toFixed(2))))
  stats.topAlbums.forEach((album) => (album.minutes = Number(album.minutes.toFixed(2))))
  Object.values(stats.artists).forEach((artist) => {
    artist.minutes = Number(artist.minutes.toFixed(2))
    artist.count = Math.round(artist.count)
  })

  console.log(stats)

  return stats
}

async function fetchTracks(
  username: string,
  apiKey: string,
  fromDate: Date,
  toDate: Date,
  onProgress?: (current: number, total: number) => void
): Promise<Track[]> {
  const tracks: Track[] = []
  let page = 1
  const limit = 200

  // Get first page to determine total pages
  const firstPageUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=${limit}&page=1&from=${Math.floor(
    fromDate.getTime() / 1000
  )}&to=${Math.floor(toDate.getTime() / 1000)}`

  const firstResponse = await fetch(firstPageUrl)
  if (!firstResponse.ok) throw new Error('Failed to fetch tracks')
  const firstData = await firstResponse.json()

  if (!firstData.recenttracks?.track) return []

  const totalPages = parseInt(firstData.recenttracks['@attr'].totalPages)
  const pageTracks = firstData.recenttracks.track.filter((track: Track) => !track['@attr']?.nowplaying)
  tracks.push(...pageTracks)
  onProgress?.(1, totalPages)

  // Fetch remaining pages
  while (page < totalPages) {
    page++
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=${limit}&page=${page}&from=${Math.floor(
      fromDate.getTime() / 1000
    )}&to=${Math.floor(toDate.getTime() / 1000)}`

    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch tracks')

    const data = await response.json()
    if (!data.recenttracks?.track) break

    const pageTracks = data.recenttracks.track.filter((track: Track) => !track['@attr']?.nowplaying)
    tracks.push(...pageTracks)
    onProgress?.(page, totalPages)
  }

  return tracks
}

async function getTrackDuration(track: Track, apiKey: string): Promise<number | null> {
  const cacheKey = `${track.artist['#text']}-${track.name}`
  const cachedDuration = cache.get(cacheKey)

  if (cachedDuration) {
    return cachedDuration
  }

  console.log('No cached duration found for:', cacheKey)

  try {
    // Try Last.fm API first
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(
      track.artist['#text']
    )}&track=${encodeURIComponent(track.name)}&api_key=${apiKey}&format=json`
    const response = await fetch(url)
    const data = await response.json()

    if (data.track?.duration && data.track.duration !== '0') {
      const duration = data.track.duration / 1000 / 60
      if (duration > 0) {
        cache.set(cacheKey, duration)
        return duration
      }
    }

    // If Last.fm fails, try MusicBrainz
    let mbDuration = await searchMusicBrainz(track.artist['#text'], track.name, track.mbid, track.artist.mbid)

    if (mbDuration.length > 0 && mbDuration[0]) {
      const duration = mbDuration[0].length / 1000 / 60
      if (duration > 0) {
        cache.set(cacheKey, duration)
        return duration
      }
    }

    // If no duration found, return null
    return null
  } catch (error) {
    console.error('Error fetching track duration:', error)
    return null
  }
}

async function getAlbumImage(album: string, artist: string, apiKey: string): Promise<string> {
  const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${apiKey}&artist=${encodeURIComponent(
    artist
  )}&album=${encodeURIComponent(album)}&format=json`
  try {
    const response = await fetch(url)
    const data = await response.json()
    if (data.album && data.album.image) {
      const image = data.album.image.find((img: { size: string }) => img.size === 'large')
      return image ? image['#text'] : ''
    }
  } catch (error) {
    console.error('Error fetching album image:', error)
  }
  return ''
}

export function updateStats(stats: Stats, track: Track, duration: number): Stats {
  const updatedStats = { ...stats }

  // Update total minutes
  updatedStats.totalMinutes += duration

  // Update artist stats
  const artistName = track.artist['#text']
  if (!updatedStats.artists[artistName]) {
    updatedStats.artists[artistName] = { count: 0, minutes: 0, mbid: track.artist.mbid || null }
  }
  const artistStats = updatedStats.artists[artistName]
  if (artistStats) {
    artistStats.count++
    artistStats.minutes += duration
  }

  // Update monthly stats
  const month = new Date(parseInt(track.date.uts) * 1000).toISOString().slice(0, 7)
  const monthIndex = updatedStats.monthlyStats.findIndex((stat) => stat.month === month)
  if (monthIndex !== -1) {
    const monthlyStat = updatedStats.monthlyStats[monthIndex]
    if (monthlyStat) monthlyStat.minutes += duration
  } else {
    updatedStats.monthlyStats.push({ month, minutes: duration })
    updatedStats.monthlyStats.sort((a, b) => a.month.localeCompare(b.month))
  }

  // Update daily stats
  const day = new Date(parseInt(track.date.uts) * 1000).toISOString().slice(0, 10)
  const dayIndex = updatedStats.dailyStats.findIndex((stat) => stat.date === day)
  if (dayIndex !== -1) {
    const dailyStat = updatedStats.dailyStats[dayIndex]
    if (dailyStat) dailyStat.minutes += duration
  } else {
    updatedStats.dailyStats.push({ date: day, minutes: duration })
    updatedStats.dailyStats.sort((a, b) => a.date.localeCompare(b.date))
  }

  // Update album stats
  const albumKey = `${track.album['#text']}-${artistName}`
  const albumIndex = updatedStats.topAlbums.findIndex((album) => `${album.name}-${album.artist}` === albumKey)
  if (albumIndex !== -1) {
    const albumStat = updatedStats.topAlbums[albumIndex]
    if (albumStat) albumStat.minutes += duration
  } else {
    // If the album is not in the top albums, we might need to fetch the image URL
    // For simplicity, we'll just add it without an image URL for now
    updatedStats.topAlbums.push({
      name: track.album['#text'],
      artist: artistName,
      minutes: duration,
      imageUrl: '',
    })
  }
  updatedStats.topAlbums.sort((a, b) => b.minutes - a.minutes)
  updatedStats.topAlbums = updatedStats.topAlbums.slice(0, 10)

  // Remove the track from unmatched tracks
  updatedStats.unmatchedTracks = updatedStats.unmatchedTracks.filter(
    (t) => t.name !== track.name || t.artist['#text'] !== track.artist['#text']
  )

  // Ensure all updated stats are numbers
  updatedStats.totalMinutes = Number(updatedStats.totalMinutes.toFixed(2))
  updatedStats.monthlyStats.forEach((stat) => (stat.minutes = Number(stat.minutes.toFixed(2))))
  updatedStats.dailyStats.forEach((stat) => (stat.minutes = Number(stat.minutes.toFixed(2))))
  updatedStats.topAlbums.forEach((album) => (album.minutes = Number(album.minutes.toFixed(2))))
  Object.values(updatedStats.artists).forEach((artist) => {
    artist.minutes = Number(artist.minutes.toFixed(2))
    artist.count = Math.round(artist.count)
  })

  return updatedStats
}

function processTrackStats(
  track: Track,
  duration: number,
  stats: Stats,
  albumMap: Map<string, AlbumStats>,
  monthlyMap: Map<string, number>,
  dailyMap: Map<string, number>,
  trackMap: Map<string, TrackStats>
) {
  stats.totalMinutes += duration

  // Artist stats
  const artistName = track.artist['#text']
  if (!stats.artists[artistName]) {
    stats.artists[artistName] = { count: 0, minutes: 0, mbid: track.artist.mbid || null }
  }
  const artistStats = stats.artists[artistName]
  if (artistStats) {
    artistStats.count++
    artistStats.minutes += duration
  }

  // Album stats
  const albumKey = `${track.album['#text']}-${artistName}`
  if (!albumMap.has(albumKey)) {
    albumMap.set(albumKey, {
      name: track.album['#text'],
      artist: artistName,
      minutes: 0,
      imageUrl: '', // We'll need to fetch this separately
    })
  }
  albumMap.get(albumKey)!.minutes += duration

  // Monthly stats
  const month = new Date(parseInt(track.date.uts) * 1000).toISOString().slice(0, 7)
  monthlyMap.set(month, (monthlyMap.get(month) || 0) + duration)

  // Daily stats
  const day = new Date(parseInt(track.date.uts) * 1000).toISOString().slice(0, 10)
  dailyMap.set(day, (dailyMap.get(day) || 0) + duration)

  // Track stats
  const trackKey = `${track.artist['#text']}-${track.name}`
  if (!trackMap.has(trackKey)) {
    trackMap.set(trackKey, {
      name: track.name,
      artist: track.artist['#text'],
      count: 0,
      minutes: 0,
    })
  }
  const trackStats = trackMap.get(trackKey)!
  trackStats.count++
  trackStats.minutes += duration
}

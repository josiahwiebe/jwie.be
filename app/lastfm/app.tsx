import { useQueryState } from 'nuqs'
import React, { useState, useEffect } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import AlbumChart from './components/album-chart'
import { fetchStats, updateStats } from './utils/stats'
import { clearCache, getCacheCount, cache } from './utils/cache'
import { UnmatchedTracks } from './components/unmatched-tracks'
import type { Track, Stats } from './types'
import { formatNumber } from './utils'
import { TopTracks } from './components/top-tracks'
import { TopArtists } from './components/top-artists'

export default function LastFmStats() {
  const [username, setUsername] = useQueryState('username', { defaultValue: '' })
  const [apiKey, setApiKey] = useQueryState('apiKey', { defaultValue: '' })
  const [fromDate, setFromDate] = useQueryState('from', { defaultValue: '' })
  const [toDate, setToDate] = useQueryState('to', { defaultValue: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'fetching' | 'processing'>('fetching')
  const [cacheCount, setCacheCount] = useState(getCacheCount)
  const [partialStats, setPartialStats] = useState<Partial<Stats> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCacheCount(getCacheCount())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleFetchStats = async () => {
    setLoading(true)
    setError('')
    setStats(null)
    setPartialStats(null)
    setPhase('fetching')
    try {
      const result = await fetchStats(
        username,
        apiKey,
        new Date(fromDate),
        new Date(toDate),
        (current, total, currentPhase) => {
          setPhase(currentPhase)
          setProgress((current / total) * 100)
        },
        (partial) => setPartialStats(partial)
      )
      setStats(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the cached track durations?')) {
      clearCache()
      setCacheCount(getCacheCount())
    }
  }

  const handleManualMatch = (track: Track, duration: number) => {
    const cacheKey = `${track.artist['#text']}-${track.name}`
    cache.set(cacheKey, duration)
    setCacheCount(getCacheCount())
    if (stats) {
      const updatedStats = updateStats(stats, track, duration)
      setStats(updatedStats)
    }
  }

  const getTimeData = () => {
    if (!stats) return { data: [], title: '', dataKey: '' }

    const msPerDay = 24 * 60 * 60 * 1000
    const daysDiff = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / msPerDay

    if (daysDiff <= 28) {
      const dailyData = stats.dailyStats || []
      return {
        data: dailyData,
        title: 'Minutes Listened per Day',
        dataKey: 'date',
      }
    } else {
      return {
        data: stats.monthlyStats,
        title: 'Minutes Listened per Month',
        dataKey: 'month',
      }
    }
  }

  const { data: timeData, title: timeChartTitle, dataKey: timeDataKey } = getTimeData()

  return (
    <div className='space-y-4'>
      <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4'>
          <input
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
            placeholder='Last.fm Username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
            placeholder='Last.fm API Key'
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <input
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
            type='date'
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
            type='date'
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className='flex flex-col sm:flex-row justify-between items-center'>
          <button
            className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 w-full sm:w-auto'
            onClick={handleFetchStats}
            disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate Stats'}
          </button>
          <div className='text-sm text-gray-500 w-full sm:w-auto mt-2 sm:mt-0'>
            Cached track durations: {cacheCount}
            <button
              className='ml-0 sm:ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50'
              onClick={handleClearCache}>
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
          <div className='w-full bg-gray-200 rounded-full h-2.5'>
            <div className='bg-primary h-2.5 rounded-full' style={{ width: `${progress}%` }}></div>
          </div>
          <p className='text-center mt-2 dark:text-slate-300'>
            {phase === 'fetching' ? 'Getting recent scrobbles' : 'Processing tracks'}: {progress.toFixed(2)}%
          </p>
        </div>
      )}

      {error && <div className='text-red-500 p-4 bg-red-100 rounded'>{error}</div>}

      {(partialStats || stats) && (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <StatCard
              title='Total Listening Time'
              subtitle='minutes'
              value={(partialStats || stats)?.totalMinutes || 0}
            />
            <StatCard title='Total Tracks' value={formatNumber((partialStats || stats)?.totalTracks || 0)} />
            <StatCard
              title='Unique Artists'
              value={formatNumber(Object.keys((partialStats || stats)?.artists || {}).length)}
            />
            <StatCard title='Unique Tracks' value={formatNumber((partialStats || stats)?.uniqueTracks || 0)} />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {stats && (
              <>
                <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
                  <h2 className='text-xl font-semibold mb-4 dark:text-slate-300'>{timeChartTitle}</h2>
                  <div className='h-[300px]'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={timeData}>
                        <XAxis dataKey={timeDataKey} />
                        <YAxis tickFormatter={(value) => formatNumber(value)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey='minutes' fill='var(--color-primary)' />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <AlbumChart albums={stats.topAlbums} />
              </>
            )}
          </div>

          {stats && (
            <>
              <TopArtists artists={stats.artists} />
              <TopTracks tracks={stats.topTracks} />
            </>
          )}

          {stats && stats.unmatchedTracks.length > 0 && (
            <UnmatchedTracks tracks={stats.unmatchedTracks} onMatch={handleManualMatch} apiKey={apiKey} />
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  const displayValue = typeof value === 'number' && !isNaN(value) ? formatNumber(value) : value
  return (
    <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
      <h3 className='text-md font-semibold dark:text-slate-300'>{title}</h3>
      <p className='mt-2 text-3xl font-semibold text-primary'>{displayValue}</p>
      {subtitle && <p className='text-sm text-gray-500 dark:text-slate-300'>{subtitle}</p>}
    </div>
  )
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-white dark:bg-slate-600 p-4 rounded shadow'>
        <p className='font-bold dark:text-slate-200'>{label}</p>
        <p className='dark:text-slate-300'>{formatNumber(payload[0].value)} minutes</p>
      </div>
    )
  }
  return null
}

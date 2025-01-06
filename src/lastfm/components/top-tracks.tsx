import React from 'react'
import { TrackStats } from '../types'
import { formatNumber } from '../utils'

interface TopTracksProps {
  tracks: TrackStats[]
}

export const TopTracks: React.FC<TopTracksProps> = ({ tracks }) => {
  return (
    <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
      <h2 className='text-xl font-semibold mb-4 dark:text-slate-300'>Top 10 Tracks</h2>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50 dark:bg-slate-700'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Track
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Artist
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Minutes
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Plays
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200 dark:bg-slate-700'>
            {tracks.map((track) => (
              <tr key={`${track.artist}-${track.name}`} className='dark:text-slate-300'>
                <td className='px-6 py-4 whitespace-nowrap'>{track.name}</td>
                <td className='px-6 py-4 whitespace-nowrap'>{track.artist}</td>
                <td className='px-6 py-4 whitespace-nowrap'>{formatNumber(track.minutes)}</td>
                <td className='px-6 py-4 whitespace-nowrap'>{formatNumber(track.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

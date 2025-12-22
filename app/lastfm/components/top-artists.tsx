import React from 'react'
import type { ArtistStats } from '../types'
import { formatNumber } from '../utils'

interface TopArtistsProps {
  artists: { [key: string]: ArtistStats }
}

export const TopArtists: React.FC<TopArtistsProps> = ({ artists }) => {
  return (
    <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
      <h2 className='text-xl font-semibold mb-4 dark:text-slate-300'>Top 10 Artists</h2>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50 dark:bg-slate-700'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Artist
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Minutes
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300'>
                Tracks
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200 dark:bg-slate-700'>
            {Object.entries(artists)
              .sort((a, b) => b[1].minutes - a[1].minutes)
              .slice(0, 10)
              .map(([artist, data]) => (
                <tr key={artist} className='dark:text-slate-300'>
                  <td className='px-6 py-4 whitespace-nowrap'>{artist}</td>
                  <td className='px-6 py-4 whitespace-nowrap'>{formatNumber(data.minutes)}</td>
                  <td className='px-6 py-4 whitespace-nowrap'>{formatNumber(data.count)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

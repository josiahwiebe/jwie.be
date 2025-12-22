import React from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { formatNumber } from '../utils'
import type { AlbumStats } from '../types'

interface AlbumChartProps {
  albums: AlbumStats[]
}

const AlbumChart: React.FC<AlbumChartProps> = ({ albums }) => {
  return (
    <div className='bg-white shadow rounded-lg p-6 dark:bg-slate-700'>
      <h2 className='text-xl font-semibold mb-4 dark:text-slate-300'>Top Albums by Playtime</h2>
      <div className='h-[400px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={albums} layout='vertical' margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type='number' tickFormatter={(value) => formatNumber(value)} />
            <YAxis dataKey='name' type='category' width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey='minutes' fill='var(--color-primary)' />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const album = payload[0].payload
    return (
      <div className='bg-white dark:bg-slate-600 p-4 rounded shadow'>
        <img src={album.imageUrl} alt={album.name} className='w-16 h-16 mb-2' />
        <p className='font-bold dark:text-slate-200'>{album.name}</p>
        <p className='dark:text-slate-300'>{album.artist}</p>
        <p className='dark:text-slate-300'>{formatNumber(album.minutes)} minutes</p>
      </div>
    )
  }
  return null
}

export default AlbumChart

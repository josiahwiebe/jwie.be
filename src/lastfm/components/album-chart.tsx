import React from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { formatNumber } from '../utils'
import { AlbumStats } from '../types'

interface AlbumChartProps {
  albums: AlbumStats[]
}

const AlbumChart: React.FC<AlbumChartProps> = ({ albums }) => {
  return (
    <div className='bg-white shadow rounded-lg p-6'>
      <h2 className='text-xl font-semibold mb-4'>Top Albums by Playtime</h2>
      <div className='h-[400px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={albums} layout='vertical' margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type='number' tickFormatter={(value) => formatNumber(value)} />
            <YAxis dataKey='name' type='category' width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey='minutes' fill='#3b82f6' />
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
      <div className='bg-white p-4 rounded shadow'>
        <img src={album.imageUrl} alt={album.name} className='w-16 h-16 mb-2' />
        <p className='font-bold'>{album.name}</p>
        <p>{album.artist}</p>
        <p>{formatNumber(album.minutes)} minutes</p>
      </div>
    )
  }
  return null
}

export default AlbumChart

import React, { useState } from 'react'
import { Track, type MusicBrainzRecording } from '../types'
import { formatNumber } from '../utils'
import { searchMusicBrainz } from '../utils/music-brainz'

interface UnmatchedTracksProps {
  tracks: Track[]
  onMatch: (track: Track, duration: number) => void
  apiKey: string
}

export const UnmatchedTracks: React.FC<UnmatchedTracksProps> = ({ tracks, onMatch }) => {
  const [manualDurations, setManualDurations] = useState<{ [key: string]: string }>({})
  const [recordings, setRecordings] = useState<{ [key: string]: MusicBrainzRecording[] }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [showModal, setShowModal] = useState<string | null>(null)
  const [editedTracks, setEditedTracks] = useState<{ [key: string]: { artist: string; name: string } }>({})

  const uniqueTracks = tracks.reduce((acc, track) => {
    const key = `${track.artist['#text']}-${track.name}`
    if (!acc[key]) {
      acc[key] = track
    }
    return acc
  }, {} as { [key: string]: Track })

  const getTrackValues = (track: Track, key: string) => {
    if (editedTracks[key]) {
      return editedTracks[key]
    }
    return {
      artist: track.artist['#text'],
      name: track.name,
    }
  }

  const handleDurationChange = (key: string, value: string) => {
    setManualDurations((prev) => ({ ...prev, [key]: value }))
  }

  const handleTrackChange = (key: string, field: 'artist' | 'name', value: string) => {
    setEditedTracks((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { artist: uniqueTracks[key].artist['#text'], name: uniqueTracks[key].name }),
        [field]: value,
      },
    }))
  }

  const handleMatch = (track: Track, duration: number) => {
    onMatch(track, duration)
    const key = `${track.artist['#text']}-${track.name}`
    setManualDurations((prev) => {
      const { [key]: _, ...rest } = prev
      return rest
    })
    setRecordings((prev) => {
      const { [key]: _, ...rest } = prev
      return rest
    })
    setShowModal(null)
  }

  const handleSearchRecordings = async (track: Track) => {
    const key = `${track.artist['#text']}-${track.name}`
    const { artist, name } = getTrackValues(track, key)
    setLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const results = await searchMusicBrainz(artist, name, track.mbid, track.artist.mbid)
      setRecordings((prev) => ({ ...prev, [key]: results }))
    } catch (error) {
      console.error('Error searching MusicBrainz:', error)
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
    setShowModal(key)
  }

  return (
    <div className='bg-white shadow rounded-lg p-6'>
      <h2 className='text-xl font-semibold mb-4'>Unmatched Tracks</h2>
      <p className='text-sm text-gray-500 mb-4'>
        Tracks where duration couldn't be determined. You can manually set durations or choose from MusicBrainz
        recordings.
      </p>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'>
                Artist
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'>
                Track
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'>
                Duration (minutes)
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'>
                Action
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {Object.values(uniqueTracks).map((track) => {
              const key = `${track.artist['#text']}-${track.name}`
              return (
                <tr key={key}>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <input
                      type='text'
                      value={getTrackValues(track, key).artist}
                      onChange={(e) => handleTrackChange(key, 'artist', e.target.value)}
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
                    />
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <input
                      type='text'
                      value={getTrackValues(track, key).name}
                      onChange={(e) => handleTrackChange(key, 'name', e.target.value)}
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
                    />
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      value={manualDurations[key] || ''}
                      onChange={(e) => handleDurationChange(key, e.target.value)}
                      placeholder='Enter duration'
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300'
                    />
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex space-x-2'>
                      <button
                        onClick={() => handleMatch(track, parseFloat(manualDurations[key]))}
                        disabled={!manualDurations[key]}
                        className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300 focus:ring-opacity-50 disabled:opacity-50'>
                        Match
                      </button>
                      <button
                        onClick={() => handleSearchRecordings(track)}
                        disabled={loading[key]}
                        className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300 focus:ring-opacity-50'>
                        {loading[key] ? 'Searching...' : 'Search MusicBrainz'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div
          className='fixed z-10 inset-0 overflow-y-auto'
          aria-labelledby='modal-title'
          role='dialog'
          aria-modal='true'>
          <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 bg-slate-400/50 backdrop-blur-xs transition-opacity' aria-hidden='true'></div>
            <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
              &#8203;
            </span>
            <div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
              <div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
                <h3 className='text-lg leading-6 font-medium text-gray-900' id='modal-title'>
                  Choose a matching recording
                </h3>
                <div className='mt-2'>
                  <h3 className='text-md text-gray-700'>Original track</h3>
                  <p className='text-sm text-gray-500'>
                    {uniqueTracks[showModal].artist['#text']} - {uniqueTracks[showModal].name}
                  </p>
                  <h3 className='text-md text-gray-700'>Artist</h3>
                  <p className='text-sm text-gray-500'>{uniqueTracks[showModal].artist['#text']}</p>
                  <h3 className='text-md text-gray-700'>Album</h3>
                  <p className='text-sm text-gray-500'>{uniqueTracks[showModal].album['#text']}</p>
                  <h3 className='text-md text-gray-700 mt-2'>Matching recordings</h3>

                  {recordings[showModal] && recordings[showModal].length > 0 ? (
                    <select
                      className='mt-1 block w-full p-3 pr-10 text-base border-gray-300 bg-gray-200 focus:outline-none focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300 sm:text-sm rounded-md'
                      onChange={(e) => handleMatch(uniqueTracks[showModal], parseInt(e.target.value) / 60000)}>
                      <option value=''>Select a recording</option>
                      {recordings[showModal].map((recording) => (
                        <option key={recording.id} value={recording.length.toString()}>
                          {recording.title} from {recording.album['#text']} by {recording.artist['#text']} (
                          {formatNumber(recording.length / 60000)} minutes)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p>No matching recordings found. Please enter a custom duration.</p>
                  )}
                </div>
              </div>
              <div className='bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
                <button
                  type='button'
                  className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-slate-400 dark:focus:ring-amber-300 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
                  onClick={() => setShowModal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { listTracks, filterTracksByLevel, getTrackById } from './tracks'

describe('Tracks Data', () => {
  it('listTracks should return at least 4 tracks', () => {
    const tracks = listTracks()
    expect(tracks.length).toBeGreaterThanOrEqual(4)
  })

  it('filterTracksByLevel should filter tracks correctly', () => {
    const inicianteTracks = filterTracksByLevel('iniciante')
    expect(inicianteTracks.length).toBeGreaterThan(0)
    expect(inicianteTracks.every(t => t.level === 'iniciante')).toBe(true)
  })

  it('getTrackById should return the correct track or undefined', () => {
    const track = getTrackById('t1')
    expect(track).toBeDefined()
    expect(track?.title).toBe('React Básico')

    const notFound = getTrackById('invalid')
    expect(notFound).toBeUndefined()
  })
})

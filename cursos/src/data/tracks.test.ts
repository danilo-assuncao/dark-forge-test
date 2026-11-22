import { TrackLevel } from '../types'
import { listTracks, filterTracksByLevel, getTrackById } from './tracks'

describe('Tracks Data', () => {
  it('listTracks should return at least 4 tracks', () => {
    const tracks = listTracks()
    expect(tracks.length).toBeGreaterThanOrEqual(4)
  })

  it('filterTracksByLevel should filter tracks correctly', () => {
    const inicianteTracks = filterTracksByLevel('iniciante')
    expect(inicianteTracks.map(t => t.id)).toEqual(['t1', 't4'])

    const intermediarioTracks = filterTracksByLevel('intermediario')
    expect(intermediarioTracks.map(t => t.id)).toEqual(['t2'])

    const avancadoTracks = filterTracksByLevel('avancado')
    expect(avancadoTracks.map(t => t.id)).toEqual(['t3'])

    const unmatchedTracks = filterTracksByLevel('invalido' as TrackLevel)
    expect(unmatchedTracks).toEqual([])
  })

  it('getTrackById should return the correct track or undefined', () => {
    const track = getTrackById('t1')
    expect(track).toBeDefined()
    expect(track?.title).toBe('React Básico')

    const notFound = getTrackById('invalid')
    expect(notFound).toBeUndefined()
  })
})

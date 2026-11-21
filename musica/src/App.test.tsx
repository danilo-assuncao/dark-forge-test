import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

describe('App', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders application header', () => {
    render(<App />);
    expect(screen.getByText('Musica SPA')).toBeInTheDocument();
  });

  it('renders initial albums', () => {
    render(<App />);
    expect(screen.getAllByText('Midnight Echoes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Urban Symphony').length).toBeGreaterThan(0);
  });

  it('changes album when clicked', () => {
    render(<App />);
    // Select the second album
    const urbanSymphonyCard = screen.getByLabelText('Select album Urban Symphony');
    fireEvent.click(urbanSymphonyCard);

    // Should display songs from second album
    expect(screen.getByText('Concrete Jungle')).toBeInTheDocument();
    expect(screen.getByText('Neon Lights')).toBeInTheDocument();
  });

  it('plays a song, pauses it via player and playlist, and checks UI states', () => {
    render(<App />);
    const playButton = screen.getByLabelText('Play Cosmic Dance');
    fireEvent.click(playButton);
    
    // Now playing state should change
    expect(screen.getByLabelText('Playing')).toBeInTheDocument();
    const pauseButton = screen.getByLabelText('Pause');
    expect(pauseButton).toBeInTheDocument();

    // Pause the song via playlist
    fireEvent.click(screen.getByLabelText('Playing'));
    expect(screen.queryByLabelText('Playing')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Play Cosmic Dance')).toBeInTheDocument();
    
    // The player pause button should turn to play
    expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument();
    
    // Play again via player
    fireEvent.click(screen.getAllByLabelText('Play')[0]); // Player's play button is the first one or we can select it specifically
    // Use getByLabelText on Player component side, pause should appear
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    expect(screen.getByLabelText('Playing')).toBeInTheDocument();
  });

  it('maintains playing song state while browsing another album, and respects cross-album next/prev', () => {
    render(<App />);
    
    // Play a song from the first album
    fireEvent.click(screen.getByLabelText('Play Cosmic Dance'));
    
    // Select the second album
    fireEvent.click(screen.getByLabelText('Select album Urban Symphony'));
    
    // The player should still show the cover of the playing album and song
    const playerCovers = screen.getAllByAltText('Midnight Echoes cover');
    expect(playerCovers.length).toBeGreaterThan(0);
    expect(screen.getByTitle('Cosmic Dance')).toBeInTheDocument();
    
    // The playlist should show the second album's songs
    expect(screen.getByText('Concrete Jungle')).toBeInTheDocument();
    
    // The first album's song should no longer be in the playlist (only the one in Player is present)
    expect(screen.getAllByText('Cosmic Dance').length).toBe(1);

    // Clicking Next while browsing second album should advance to next song of the FIRST album
    fireEvent.click(screen.getByLabelText('Next song'));
    expect(screen.getByTitle('Nebula Dreams')).toBeInTheDocument();

    // Play a song from the second album
    fireEvent.click(screen.getByLabelText('Play Concrete Jungle'));
    expect(screen.getAllByAltText('Urban Symphony cover').length).toBeGreaterThan(0);
  });

  it('navigates previous and next songs, including wrap-around', () => {
    render(<App />);
    
    // Start playback on first song
    fireEvent.click(screen.getByLabelText('Play Cosmic Dance'));
    expect(screen.getByTitle('Cosmic Dance')).toBeInTheDocument();
    
    // Previous song from the first song wraps to the last song
    fireEvent.click(screen.getByLabelText('Previous song'));
    expect(screen.getByTitle('Lunar Rise')).toBeInTheDocument();
    
    // Next song from the last song wraps to the first song
    fireEvent.click(screen.getByLabelText('Next song'));
    expect(screen.getByTitle('Cosmic Dance')).toBeInTheDocument();

    // Next song goes to second song
    fireEvent.click(screen.getByLabelText('Next song'));
    expect(screen.getByTitle('Nebula Dreams')).toBeInTheDocument();
  });

  it('advances elapsed time and automatically goes to next song at the end', () => {
    vi.useFakeTimers();
    render(<App />);

    // Play a short song (Cosmic Dance is 3:45, meaning 225 seconds)
    fireEvent.click(screen.getByLabelText('Play Cosmic Dance'));
    
    expect(screen.getByText('0:00')).toBeInTheDocument();
    
    // Advance timers by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(screen.getByText('0:03')).toBeInTheDocument();

    // Pause the song
    fireEvent.click(screen.getByLabelText('Pause'));
    
    // Advance timers by another 3 seconds (should not change time)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('0:03')).toBeInTheDocument();
    
    // Resume and skip almost to the end
    fireEvent.click(screen.getAllByLabelText('Play')[0]); // Player's Play button
    act(() => {
      vi.advanceTimersByTime(222000); // reaches 225 seconds
    });
    
    // It should have moved to the next song (Nebula Dreams)
    expect(screen.getByTitle('Nebula Dreams')).toBeInTheDocument();
    
    // Elapsed should reset to 0:00
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('does not double advance when switching to a shorter song', () => {
    vi.useFakeTimers();
    render(<App />);

    // Play "Nebula Dreams" (4:12 = 252s)
    fireEvent.click(screen.getByLabelText('Play Nebula Dreams'));
    
    // Advance timers by 250 seconds (near the end)
    act(() => {
      vi.advanceTimersByTime(250000);
    });
    
    expect(screen.getByText('4:10')).toBeInTheDocument();

    // Click next to go to "Solar Wind" (3:28 = 208s)
    fireEvent.click(screen.getByLabelText('Next song'));
    
    // If bug was present, it would instantly advance to Lunar Rise because 250s > 208s.
    // It should be on Solar Wind and time should be 0:00.
    expect(screen.getByTitle('Solar Wind')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.queryByTitle('Lunar Rise')).not.toBeInTheDocument();
  });
});

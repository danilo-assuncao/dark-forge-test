import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
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

  it('plays a song, pauses it, and checks UI states', () => {
    render(<App />);
    const playButton = screen.getByLabelText('Play Cosmic Dance');
    fireEvent.click(playButton);
    
    // Now playing state should change
    expect(screen.getByLabelText('Playing')).toBeInTheDocument();
    const pauseButton = screen.getByLabelText('Pause');
    expect(pauseButton).toBeInTheDocument();

    // Pause the song
    fireEvent.click(pauseButton);
    expect(screen.queryByLabelText('Playing')).not.toBeInTheDocument();
    
    // Should have multiple 'Play' labels since the album has multiple songs
    // But we check that the specific pause button is gone and play is back
    expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Play').length).toBeGreaterThan(0);
  });

  it('maintains playing song state while browsing another album', () => {
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
  });

  it('navigates previous and next songs', () => {
    render(<App />);
    
    // Start playback
    fireEvent.click(screen.getByLabelText('Play Cosmic Dance'));
    expect(screen.getByTitle('Cosmic Dance')).toBeInTheDocument();
    
    // Next song
    fireEvent.click(screen.getByLabelText('Next song'));
    expect(screen.getByTitle('Nebula Dreams')).toBeInTheDocument();
    
    // Previous song
    fireEvent.click(screen.getByLabelText('Previous song'));
    expect(screen.getByTitle('Cosmic Dance')).toBeInTheDocument();
  });
});

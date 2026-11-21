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

  it('plays a song when clicked', () => {
    render(<App />);
    // The play button for the first song
    const playButton = screen.getByLabelText('Play Cosmic Dance');
    fireEvent.click(playButton);
    
    // Now playing state should change
    expect(screen.getByLabelText('Playing')).toBeInTheDocument();
    
    // Player controls should show Pause
    const pauseButton = screen.getByLabelText('Pause');
    expect(pauseButton).toBeInTheDocument();
  });
});

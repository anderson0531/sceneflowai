import React from 'react';
import { Track, useAudioPlayer } from '../hooks/useAudioPlayer';

export default function AudioPlayer({ initialPlaylist = [] as Track[] }:{ initialPlaylist?: Track[] }) {
  const player = useAudioPlayer();

  React.useEffect(() => {
    if (initialPlaylist && initialPlaylist.length) {
      player.loadPlaylist(initialPlaylist, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="audio-player" style={{ padding: 8, background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={player.playPrev} aria-label="Previous">⏮</button>
        {player.isPlaying ? (
          <button onClick={player.pause} aria-label="Pause">⏸</button>
        ) : (
          <button onClick={player.play} aria-label="Play">▶</button>
        )}
        <button onClick={player.playNext} aria-label="Next">⏭</button>
        <div style={{ marginLeft: 12 }}>
          <strong>Now:</strong> {player.current?.title ?? player.current?.url ?? '—'}
        </div>
      </div>
      {player.error && <div style={{ color: 'salmon', marginTop: 6 }}>Audio error: {player.error}</div>}
    </div>
  );
}

import React from 'react';
import { useAudioPlayerContext } from '../context/AudioPlayerProvider';

export default function AudioDebugPanel() {
  let player = null;
  try {
    player = useAudioPlayerContext();
  } catch (e) {
    return <div style={{ padding: 8, color: '#999' }}>AudioPlayerProvider not mounted</div>;
  }

  const q = player.getQueue();

  return (
    <div style={{ fontSize: 12, padding: 8, background: '#0b1220', color: '#d6f3ff', borderRadius: 6 }}>
      <div><strong>Audio Debug</strong></div>
      <div>Playing: {player.isPlaying ? 'yes' : 'no'}</div>
      <div>Current: {player.current ? `${player.current.title ?? player.current.url}` : '—'}</div>
      <div style={{ marginTop: 6 }}>Queue ({q.length}):</div>
      <ol style={{ margin: '6px 0', paddingLeft: 18 }}>
        {q.map((t, i) => (
          <li key={t.id ?? `${i}-${t.url}`} title={t.url} style={{ color: '#cfe' }}>
            {t.title ?? t.type ?? 'track'}
          </li>
        ))}
      </ol>
      {player.error && <div style={{ color: 'salmon' }}>Error: {player.error}</div>}
    </div>
  );
}

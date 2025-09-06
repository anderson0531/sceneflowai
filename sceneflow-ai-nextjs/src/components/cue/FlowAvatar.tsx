'use client';

import React from 'react';

type FlowStatus = 'idle' | 'listening' | 'processing' | 'suggestion';

interface FlowAvatarProps {
  status?: FlowStatus;
  size?: number;
  className?: string;
}

export const FlowAvatar: React.FC<FlowAvatarProps> = ({ status = 'idle', size = 56, className }) => {
  const classes = [
    'flow-avatar',
    status === 'processing' ? 'processing' : '',
    className || ''
  ].join(' ').trim();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} className={classes}>
      <style>{`
        :root {
          --color-core: #00FFFF;
          --color-ring-1: #3A00B2;
          --color-ring-2: #00aaff;
          --color-processing: #A020F0;
        }
        .flow-avatar { transition: filter 0.5s ease; }
        .flow-core { fill: var(--color-core); transform-origin: center; animation: breathe 5s infinite ease-in-out; }
        .flow-ring { fill: none; stroke-width: 2; opacity: 0.85; }
        .flow-ring-1 { stroke: var(--color-ring-1); transform-origin: center; animation: orbit-1 15s linear infinite; }
        .flow-ring-2 { stroke: var(--color-ring-2); transform-origin: center; animation: orbit-2 12s linear reverse infinite; }
        @keyframes breathe { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.1);opacity:1}}
        @keyframes orbit-1 { from{transform:rotateX(60deg) rotateY(45deg) rotateZ(0deg)} to{transform:rotateX(60deg) rotateY(45deg) rotateZ(360deg)} }
        @keyframes orbit-2 { from{transform:rotateX(-70deg) rotateY(30deg) rotateZ(0deg)} to{transform:rotateX(-70deg) rotateY(30deg) rotateZ(360deg)} }
        .flow-avatar.processing .flow-ring-1 { animation-duration: 2s; }
        .flow-avatar.processing .flow-ring-2 { animation-duration: 1.5s; }
        .flow-avatar.processing .flow-core { animation-duration: 2s; fill: var(--color-processing); }
        .flow-avatar.processing { filter: brightness(1.25); }
      `}</style>

      <defs>
        <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(50, 50)" filter="url(#glowFilter)">
        <g className="flow-ring-1">
          <ellipse cx="0" cy="0" rx="35" ry="35" className="flow-ring" />
        </g>
        <g className="flow-ring-2">
          <ellipse cx="0" cy="0" rx="30" ry="30" className="flow-ring" />
        </g>
        <circle cx="0" cy="0" r="12" className="flow-core" />
      </g>
    </svg>
  );
};

export default FlowAvatar;



'use client';

import React from 'react';

export interface TileOption {
  id: string;
  name: string;
  colorHex: string;
  prompt: string;
}

const TILE_CATALOG: TileOption[] = [
  { id: '1', name: 'Terracotta Red', colorHex: '#8b3a2b', prompt: 'red terracotta spanish roof tiles' },
  { id: '2', name: 'Slate Grey', colorHex: '#4a5568', prompt: 'dark grey slate roof tiles' },
  { id: '3', name: 'Charcoal Asphalt', colorHex: '#2d3748', prompt: 'charcoal black asphalt shingles' },
  { id: '4', name: 'Mediterranean Clay', colorHex: '#cd5c5c', prompt: 'mediterranean clay barrel roof tiles' },
  { id: '5', name: 'Forest Green', colorHex: '#2f4f4f', prompt: 'forest green metal standing seam roof' },
  { id: '6', name: 'Weathered Wood', colorHex: '#8b7355', prompt: 'weathered wood cedar shake roof' },
];

interface TileSelectorProps {
  selectedTileId: string | null;
  onTileSelect: (tile: TileOption) => void;
}

export default function TileSelector({ selectedTileId, onTileSelect }: TileSelectorProps) {
  return (
    <div className="glass-panel">
      <h2>Select Roof Style</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Choose a material and color for your new roof.</p>
      
      <div className="tile-grid">
        {TILE_CATALOG.map((tile) => (
          <div
            key={tile.id}
            className={`tile-option ${selectedTileId === tile.id ? 'selected' : ''}`}
            onClick={() => onTileSelect(tile)}
            title={tile.name}
          >
            {/* Fallback color square until we have real thumbnail images */}
            <div style={{ width: '100%', height: '100%', backgroundColor: tile.colorHex }} />
            <div className="tile-name">{tile.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

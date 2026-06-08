'use client';

import React, { useState } from 'react';
import { TILE_CATALOG, TileOption } from '../config/tileCatalog';

// Re-export TileOption to ensure backwards compatibility with page.tsx
export type { TileOption };

interface TileSelectorProps {
  selectedTileId: string | null;
  onTileSelect: (tile: TileOption) => void;
}

export default function TileSelector({ selectedTileId, onTileSelect }: TileSelectorProps) {
  // Extract categories dynamically from the catalog data to ensure modularity
  const categories = Array.from(new Set(TILE_CATALOG.map((tile) => tile.category)));

  // Set default category to the first category if available
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0] || 'Architectural Tiles'
  );

  // Tracks which thumbnails have completed loading to apply a smooth fade-in
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Filter tiles based on selected category
  const filteredTiles = TILE_CATALOG.filter((tile) => tile.category === selectedCategory);

  return (
    <div className="glass-panel">
      <h2>2. Select Roof Style</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
        Choose a material and color for your new roof.
      </p>

      {/* Dynamic Tabs based on categories in the data */}
      {categories.length > 0 && (
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              className={`tab-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Container for Tile Options */}
      <div className="tile-scroll-container">
        <div className="tile-grid">
          {filteredTiles.map((tile) => {
            const isSelected = selectedTileId === tile.id;
            const isLoaded = loadedImages[tile.id];

            return (
              <div
                key={tile.id}
                className={`tile-option ${isSelected ? 'selected' : ''}`}
                onClick={() => onTileSelect(tile)}
                title={tile.name}
              >
                {/* Visual Thumbnail with Color Hex Fallback & Smooth Fade-in */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundColor: tile.colorHex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={tile.thumbnailUrl}
                    alt={tile.name}
                    className="tile-image"
                    onLoad={() => handleImageLoad(tile.id)}
                    style={{
                      opacity: isLoaded ? 1 : 0,
                      transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                  {/* Subtle placeholder/loader until image is loaded */}
                  {!isLoaded && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: tile.colorHex,
                        opacity: 0.8,
                      }}
                    />
                  )}
                </div>
                <div className="tile-name">{tile.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { TILE_CATALOG, TileOption } from '../config/tileCatalog';
import { createClient } from '../utils/supabase/client';

// Re-export TileOption to ensure backwards compatibility with page.tsx
export type { TileOption };

interface TileSelectorProps {
  selectedTileId: string | null;
  onTileSelect: (tile: TileOption) => void;
}

export default function TileSelector({ selectedTileId, onTileSelect }: TileSelectorProps) {
  const [tiles, setTiles] = useState<TileOption[]>(TILE_CATALOG);

  useEffect(() => {
    const fetchTiles = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('roof_tiles')
          .select('*');

        if (error) {
          console.warn("Failed to fetch tiles from Supabase, using local fallback.");
          return;
        }

        if (data && data.length > 0) {
          const mappedTiles: TileOption[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            colorHex: t.color_hex || t.colorHex || '#000000',
            prompt: t.prompt,
            thumbnailUrl: t.thumbnail_url || t.thumbnailUrl || ''
          }));
          setTiles(mappedTiles);
        }
      } catch (err) {
        console.warn("Error loading roof tiles from DB:", err);
      }
    };

    fetchTiles();
  }, []);

  // Extract categories dynamically from the catalog data to ensure modularity
  const categories = Array.from(new Set(tiles.map((tile) => tile.category)));

  // Set default category to the first category if available
  const [selectedCategory, setSelectedCategory] = useState<string>('Architectural Tiles');

  // Sync selectedCategory when categories load
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [tiles]);

  // Tracks which thumbnails have completed loading to apply a smooth fade-in
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Filter tiles based on selected category
  const filteredTiles = tiles.filter((tile) => tile.category === selectedCategory);

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

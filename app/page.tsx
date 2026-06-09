'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '../components/ImageUploader';
import TileSelector, { TileOption } from '../components/TileSelector';
import ImageSlider from '../components/ImageSlider';
import HistoryPanel from '../components/HistoryPanel';
import { createClient } from '../utils/supabase/client';
import { TILE_CATALOG } from '../config/tileCatalog';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        console.error('Failed to get user session:', err);
      }
    };
    fetchUserSession();
  }, []);

  const handleImageSelected = (file: File, previewUrl: string) => {
    setOriginalImage(file);
    setOriginalPreviewUrl(previewUrl);
    setGeneratedImageUrl(null); // Reset generated image when a new one is uploaded
  };

  const handleGenerate = async () => {
    if (!originalImage || !selectedTile) return;

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append('image', originalImage);
      formData.append('prompt', selectedTile.prompt);
      formData.append('tileId', selectedTile.id);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImageUrl(data.url);
      setRefreshTrigger(prev => prev + 1); // Reload history logs

    } catch (error: any) {
      console.error("Failed to generate image", error);
      alert(`Failed to generate image: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      router.push('/login');
    } catch (err) {
      console.error('Failed to sign out user:', err);
    }
  };

  const handleHistorySelect = (originalUrl: string, generatedUrl: string, tileId: string | null) => {
    setOriginalPreviewUrl(originalUrl);
    setGeneratedImageUrl(generatedUrl);
    setOriginalImage(null); // Clear active file upload state

    // Highlight the matching tile option if found in local catalog definition
    if (tileId) {
      const matchedTile = TILE_CATALOG.find(t => t.id === tileId);
      if (matchedTile) {
        setSelectedTile(matchedTile);
      }
    }
  };

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ marginBottom: '0.2rem' }}>Roof Tile Visualizer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            See what your house looks like with a brand new roof instantly.
          </p>
        </div>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              👤 {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="tab-button"
              style={{ padding: '4px 12px', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      <div className="grid-layout">
        {/* Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div className="glass-panel">
            <h2>1. Upload Photo</h2>
            <ImageUploader
              onImageSelected={handleImageSelected}
              isLoading={isGenerating}
            />
            {originalImage && (
              <p style={{ color: 'var(--success)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                ✓ {originalImage.name} uploaded successfully
              </p>
            )}
          </div>

          <TileSelector
            selectedTileId={selectedTile?.id || null}
            onTileSelect={setSelectedTile}
          />

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: 'var(--spacing-sm)' }}
            disabled={!originalImage || !selectedTile || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Generating...' : '3. Visualize New Roof'}
          </button>

          {/* History Log panel */}
          <HistoryPanel onSelect={handleHistorySelect} refreshTrigger={refreshTrigger} />
        </div>

        {/* Main Display Area */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>4. Result</h2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
            {!originalPreviewUrl ? (
              <p style={{ color: 'var(--text-secondary)' }}>Upload an image to see the result</p>
            ) : isGenerating ? (
              <div style={{ textAlign: 'center' }}>
                <div className="loader" style={{ marginBottom: '1rem' }}></div>
                <p>Applying AI magic...</p>
              </div>
            ) : generatedImageUrl ? (
              <ImageSlider beforeImage={originalPreviewUrl} afterImage={generatedImageUrl} />
            ) : (
              <div className="comparison-container fade-in">
                <img src={originalPreviewUrl} alt="Original House" />
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(4px)' }}>
                  Before
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '../components/ImageUploader';
import TileSelector, { TileOption } from '../components/TileSelector';
import ImageSlider from '../components/ImageSlider';
import HistoryPanel from '../components/HistoryPanel';
import { createClient } from '../utils/supabase/client';
import { TILE_CATALOG } from '../config/tileCatalog';
import { formatLocalTimestamp } from '../utils/historyUtils';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Layout Tab and Slider States
  const [activeControlTab, setActiveControlTab] = useState<'upload' | 'style'>('upload');
  const [activeResultTab, setActiveResultTab] = useState<'result' | 'history'>('result');
  const [useSlider, setUseSlider] = useState(false);
  const [showBeforeImage, setShowBeforeImage] = useState(false);

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
    setActiveControlTab('style'); // Auto-switch to Select Style tab
  };

  const handleGenerate = async () => {
    if (!originalImage || !selectedTile) return;

    setIsGenerating(true);

    try {
      const now = new Date();
      const localTimestamp = formatLocalTimestamp(now);

      const formData = new FormData();
      formData.append('image', originalImage);
      formData.append('prompt', selectedTile.prompt);
      formData.append('tileId', selectedTile.id);
      formData.append('originalFileName', originalImage.name);
      formData.append('tileCategory', selectedTile.category);
      formData.append('tileName', selectedTile.name);
      formData.append('timestamp', localTimestamp);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImageUrl(data.url);

      // Persist to local mock database client-side if we are in mock mode
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (isMock) {
        try {
          const supabase = createClient();
          await supabase.from('generations').insert({
            tile_id: selectedTile.id,
            prompt: selectedTile.prompt,
            original_image_url: originalPreviewUrl,
            generated_image_url: data.url
          });
        } catch (dbErr) {
          console.warn('Failed to insert mock generation:', dbErr);
        }
      }

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

    // Automatically focus results tab when viewing a past rendering
    setActiveResultTab('result');
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
        {/* Combined Sidebar Controls */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '520px', gap: 'var(--spacing-md)' }}>
          <div className="tabs-container">
            <button
              className={`tab-button ${activeControlTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveControlTab('upload')}
              type="button"
            >
              Upload Photo
            </button>
            <button
              className={`tab-button ${activeControlTab === 'style' ? 'active' : ''}`}
              onClick={() => setActiveControlTab('style')}
              type="button"
            >
              Select Roof Style
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {activeControlTab === 'upload' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <ImageUploader
                  onImageSelected={handleImageSelected}
                  isLoading={isGenerating}
                />
                {originalImage && (
                  <p style={{ color: 'var(--success)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                    ✓ {originalImage.name} uploaded successfully
                  </p>
                )}
              </div>
            ) : (
              <TileSelector
                selectedTileId={selectedTile?.id || null}
                onTileSelect={setSelectedTile}
              />
            )}
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: 'var(--spacing-sm)' }}
            disabled={!originalImage || !selectedTile || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Generating...' : '3. Visualize New Roof'}
          </button>
        </div>

        {/* Tabbed Results Display Area */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div className="tabs-container" style={{ width: '100%', maxWidth: '350px' }}>
            <button
              className={`tab-button ${activeResultTab === 'result' ? 'active' : ''}`}
              onClick={() => setActiveResultTab('result')}
              type="button"
            >
              Result
            </button>
            <button
              className={`tab-button ${activeResultTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveResultTab('history')}
              type="button"
            >
              Render History
            </button>
          </div>

          {activeResultTab === 'result' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Optional Slider Controls */}
              {originalPreviewUrl && generatedImageUrl && !isGenerating && (
                <div className="controls-row">
                  <label className="switch-container">
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={useSlider}
                        onChange={(e) => setUseSlider(e.target.checked)}
                      />
                      <span className="slider-round"></span>
                    </span>
                    Compare with Slider
                  </label>

                  {!useSlider && (
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={showBeforeImage}
                        onChange={(e) => setShowBeforeImage(e.target.checked)}
                      />
                      Show Before Image
                    </label>
                  )}
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)' }}>
                {!originalPreviewUrl ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Upload an image to see the result</p>
                ) : isGenerating ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="loader" style={{ marginBottom: '1rem' }}></div>
                    <p>Applying AI magic...</p>
                  </div>
                ) : generatedImageUrl ? (
                  useSlider ? (
                    <ImageSlider beforeImage={originalPreviewUrl} afterImage={generatedImageUrl} />
                  ) : showBeforeImage ? (
                    <div className="comparison-container fade-in" style={{ width: '100%' }}>
                      <img src={originalPreviewUrl} alt="Original House" style={{ pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                        Before
                      </div>
                    </div>
                  ) : (
                    <div className="comparison-container fade-in" style={{ width: '100%' }}>
                      <img src={generatedImageUrl} alt="Generated House" style={{ pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                        After
                      </div>
                    </div>
                  )
                ) : (
                  <div className="comparison-container fade-in" style={{ width: '100%' }}>
                    <img src={originalPreviewUrl} alt="Original House" style={{ pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                      Before
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <HistoryPanel onSelect={handleHistorySelect} refreshTrigger={refreshTrigger} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

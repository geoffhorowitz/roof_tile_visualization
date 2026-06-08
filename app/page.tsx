'use client';

import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader';
import TileSelector, { TileOption } from '../components/TileSelector';
import ImageSlider from '../components/ImageSlider';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImageUrl(data.url);

    } catch (error: any) {
      console.error("Failed to generate image", error);
      alert(`Failed to generate image: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="container">
      <header style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h1>Roof Tile Visualizer</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          See what your house looks like with a brand new roof instantly.
        </p>
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
            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: 'auto' }}
            disabled={!originalImage || !selectedTile || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Generating...' : '3. Visualize New Roof'}
          </button>
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

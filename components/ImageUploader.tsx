'use client';

import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
  onImageSelected: (file: File, previewUrl: string) => void;
  isLoading?: boolean;
}

export default function ImageUploader({ onImageSelected, isLoading = false }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (!isLoading) {
      inputRef.current?.click();
    }
  };

  const handleUseDefault = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch('/house.jpg');
      if (!response.ok) throw new Error('Failed to fetch default house photo');
      const blob = await response.blob();
      const file = new File([blob], 'house.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(file);
      onImageSelected(file, previewUrl);
    } catch (err: any) {
      console.error(err);
      alert('Failed to load default house image: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {isLoading ? (
          <div className="loader"></div>
        ) : (
          <>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto 1rem', color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Drag & Drop your house photo here</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>or click to browse from your device</p>
            <button className="btn-primary" type="button">Select Image</button>
          </>
        )}
      </div>

      {!isLoading && (
        <button
          type="button"
          className="tab-button"
          onClick={handleUseDefault}
          style={{
            alignSelf: 'center',
            padding: '8px 16px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255, 255, 255, 0.05)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
            transition: 'background 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          🖼️ Use Default House Photo
        </button>
      )}
    </div>
  );
}

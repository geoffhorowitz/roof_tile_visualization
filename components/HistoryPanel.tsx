'use client';

import React, { useEffect, useState } from 'react';
import { createClient, isMockMode } from '../utils/supabase/client';
import { getHistoryLabelFromUrl } from '../utils/historyUtils';

interface Generation {
  id: string;
  created_at: string;
  original_image_url: string;
  generated_image_url: string;
  tile_id: string | null;
  prompt: string;
  roof_tiles?: {
    name: string;
    category: string;
    color_hex: string;
  };
}

interface HistoryPanelProps {
  onSelect: (originalUrl: string, generatedUrl: string, tileId: string | null) => void;
  refreshTrigger: number;
}

export default function HistoryPanel({ onSelect, refreshTrigger }: HistoryPanelProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      
      const { data, error: dbError } = await supabase
        .from('generations')
        .select('*, roof_tiles(name, category, color_hex)')
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }
      
      setGenerations(data || []);
    } catch (err: any) {
      console.error('Failed to load generation history:', err);
      setError('Could not load history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerations();
  }, [refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this generation?')) return;

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setGenerations((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      alert(`Failed to delete generation: ${err.message}`);
    }
  };

  if (isLoading && generations.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-md)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading past runs...</p>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>No generations found yet. Start by visualizing a roof!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ marginBottom: 0 }}>Generation History</h3>
        {isMockMode && (
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
            Local Mock DB
          </span>
        )}
      </div>
      
      {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}
      
      <div className="tile-scroll-container" style={{ maxHeight: '450px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {generations.map((g) => {
            const dateStr = new Date(g.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const renderLabel = getHistoryLabelFromUrl(g.generated_image_url) || g.roof_tiles?.name || 'Custom style';

            return (
              <div
                key={g.id}
                onClick={() => onSelect(g.original_image_url, g.generated_image_url, g.tile_id)}
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  gap: '12px',
                  cursor: 'pointer',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  transition: 'transform 0.2s, background 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                  <img
                    src={g.generated_image_url}
                    alt="Result thumbnail"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, paddingRight: '24px', flex: 1 }}>
                  <div 
                    style={{ 
                      fontWeight: 600, 
                      fontSize: '0.85rem', 
                      color: 'white',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      lineHeight: '1.2',
                      marginBottom: '4px'
                    }}
                    title={renderLabel}
                  >
                    {renderLabel}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {dateStr}
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(e, g.id)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    transition: 'background 0.2s, color 0.2s',
                    zIndex: 5
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                    e.currentTarget.style.color = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  title="Delete generation history"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { CldImage } from 'next-cloudinary';
import type { Media } from '@/types';

interface DraggableMediaItemProps {
  media: Media;
  type: 'masthead' | 'featured';
  onToggle: (media: Media) => void;
  onDragDrop: (draggedId: number, targetId: number) => void;
}

export default function MainPageEditor() {
  const [mastheadImages, setMastheadImages] = useState<Media[]>([]);
  const [featuredImages, setFeaturedImages] = useState<Media[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mastheadRes, featuredRes, allRes] = await Promise.all([
        fetch('/api/media?is_masthead=true'),
        fetch('/api/media?is_featured=true'),
        fetch('/api/media'),
      ]);

      const mastheadData = await mastheadRes.json();
      const featuredData = await featuredRes.json();
      const allData = await allRes.json();

      // Handle responses gracefully, even if there are errors
      setMastheadImages(mastheadData.media || []);
      setFeaturedImages(featuredData.media || []);
      setAllMedia(allData.media || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      // Set empty arrays on error to show empty states
      setMastheadImages([]);
      setFeaturedImages([]);
      setAllMedia([]);
      // Only show alert for non-network errors
      if (err.message && !err.message.includes('Failed to fetch')) {
        alert('Error loading data: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMasthead = async (media: Media) => {
    try {
      const response = await fetch(`/api/media/${media.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_masthead: !media.is_masthead,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');
      fetchData();
    } catch (err: any) {
      alert('Error updating: ' + err.message);
    }
  };

  const handleToggleFeatured = async (media: Media) => {
    try {
      const response = await fetch(`/api/media/${media.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_featured: !media.is_featured,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');
      fetchData();
    } catch (err: any) {
      alert('Error updating: ' + err.message);
    }
  };

  const handleBatchUpdate = async (ids: number[], updates: Partial<Media>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/media/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });

      if (!response.ok) throw new Error('Batch update failed');
      fetchData();
    } catch (err: any) {
      alert('Error updating: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDragDrop = async (type: 'masthead' | 'featured', draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;

    const currentImages = type === 'masthead' ? mastheadImages : featuredImages;
    const sortedImages = [...currentImages].sort((a, b) => {
      const aOrder = type === 'masthead' ? (a.masthead_order ?? 999) : (a.featured_order ?? 999);
      const bOrder = type === 'masthead' ? (b.masthead_order ?? 999) : (b.featured_order ?? 999);
      return aOrder - bOrder;
    });

    const draggedIndex = sortedImages.findIndex(img => img.id === draggedId);
    const targetIndex = sortedImages.findIndex(img => img.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order by moving dragged item to target position
    const newImages = [...sortedImages];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedItem);

    // Optimistically update local state immediately (no page refresh)
    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      [type === 'masthead' ? 'masthead_order' : 'featured_order']: index,
    }));

    if (type === 'masthead') {
      setMastheadImages(reorderedImages);
    } else {
      setFeaturedImages(reorderedImages);
    }

    try {
      const response = await fetch('/api/media/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          mediaIds: newImages.map(img => img.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder images');
      }
      // Success - no need to refetch since we've already updated the UI optimistically
    } catch (err: any) {
      console.error('Error reordering images:', err);
      // Revert to original order on error by refetching
      fetchData();
      alert('Error reordering images: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Main Page Editor</h1>
        <p className="mt-2 text-sm text-gray-900">
          Configure images for the main page masthead carousel and featured section
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Masthead Carousel</h2>
          <button
            onClick={() => {
              const nonMasthead = allMedia.filter((m) => !m.is_masthead);
              if (nonMasthead.length > 0) {
                handleBatchUpdate(
                  nonMasthead.slice(0, 5).map((m) => m.id),
                  { is_masthead: true }
                );
              }
            }}
            className="text-sm text-gray-900 hover:text-gray-900"
          >
            Add First 5 Available
          </button>
        </div>
        <p className="text-sm text-gray-900 mb-4">
          Images displayed in the carousel at the top of the main page
        </p>

        {mastheadImages.length === 0 ? (
          <p className="text-gray-900 text-center py-8">
            No masthead images. Mark images as "Masthead" to add them here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...mastheadImages].sort((a, b) => (a.masthead_order ?? 999) - (b.masthead_order ?? 999)).map((media) => (
              <DraggableMediaItem
                key={media.id}
                media={media}
                type="masthead"
                onToggle={handleToggleMasthead}
                onDragDrop={(draggedId, targetId) => handleDragDrop('masthead', draggedId, targetId)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Featured Images</h2>
          <button
            onClick={() => {
              const nonFeatured = allMedia.filter((m) => !m.is_featured);
              if (nonFeatured.length > 0) {
                handleBatchUpdate(
                  nonFeatured.slice(0, 10).map((m) => m.id),
                  { is_featured: true }
                );
              }
            }}
            className="text-sm text-gray-900 hover:text-gray-900"
          >
            Add First 10 Available
          </button>
        </div>
        <p className="text-sm text-gray-900 mb-4">
          Images displayed in the featured section below the masthead
        </p>

        {featuredImages.length === 0 ? (
          <p className="text-gray-900 text-center py-8">
            No featured images. Mark images as "Featured" to add them here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...featuredImages].sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999)).map((media) => (
              <DraggableMediaItem
                key={media.id}
                media={media}
                type="featured"
                onToggle={handleToggleFeatured}
                onDragDrop={(draggedId, targetId) => handleDragDrop('featured', draggedId, targetId)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">All Media</h2>
        <p className="text-sm text-gray-900 mb-4">
          Click to toggle masthead or featured status
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allMedia.map((media) => (
            <div key={media.id} className="relative group">
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                <CldImage
                  src={media.cloudinary_public_id}
                  alt={media.caption || 'Media'}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2 flex flex-col space-y-1">
                  {media.is_masthead && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Masthead
                    </span>
                  )}
                  {media.is_featured && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex space-x-1">
                <button
                  onClick={() => handleToggleMasthead(media)}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    media.is_masthead
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {media.is_masthead ? 'Masthead' : 'Add Masthead'}
                </button>
                <button
                  onClick={() => handleToggleFeatured(media)}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    media.is_featured
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {media.is_featured ? 'Featured' : 'Add Featured'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DraggableMediaItem({ media, type, onToggle, onDragDrop }: DraggableMediaItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', media.id.toString());
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedId && draggedId !== media.id) {
      onDragDrop(draggedId, media.id);
    }
  };

  const aspectClass = type === 'masthead' ? 'aspect-video' : 'aspect-square';
  const label = type === 'masthead' ? 'Masthead' : 'Featured';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${
        dragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      <div className={`${aspectClass} relative rounded-lg overflow-hidden bg-gray-100`}>
        <CldImage
          src={media.cloudinary_public_id}
          alt={media.caption || `${label} image`}
          fill
          className="object-cover"
        />
      </div>
      <button
        onClick={() => onToggle(media)}
        className="mt-2 w-full px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        Remove from {label}
      </button>
    </div>
  );
}


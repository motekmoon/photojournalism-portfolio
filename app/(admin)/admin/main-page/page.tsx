'use client';

import { useState, useEffect } from 'react';
import { CldImage } from 'next-cloudinary';
import type { Media, Story } from '@/types';

interface DraggableMediaItemProps {
  media: Media;
  onToggle: (media: Media) => void;
  onDragDrop: (draggedId: number, targetId: number) => void;
}

interface DraggableStoryItemProps {
  story: Story;
  onToggle: (story: Story) => void;
  onDragDrop: (draggedId: number, targetId: number) => void;
}

export default function MainPageEditor() {
  const [mastheadImages, setMastheadImages] = useState<Media[]>([]);
  const [featuredStories, setFeaturedStories] = useState<Story[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mastheadRes, featuredStoriesRes, allMediaRes, allStoriesRes] = await Promise.all([
        fetch('/api/media?is_masthead=true'),
        fetch('/api/stories?is_featured=true'),
        fetch('/api/media'),
        fetch('/api/stories'),
      ]);

      const mastheadData = await mastheadRes.json();
      const featuredStoriesData = await featuredStoriesRes.json();
      const allMediaData = await allMediaRes.json();
      const allStoriesData = await allStoriesRes.json();

      setMastheadImages(mastheadData.media || []);
      setFeaturedStories(featuredStoriesData.stories || []);
      setAllMedia(allMediaData.media || []);
      setAllStories(allStoriesData.stories || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setMastheadImages([]);
      setFeaturedStories([]);
      setAllMedia([]);
      setAllStories([]);
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

  const handleToggleFeaturedStory = async (story: Story) => {
    try {
      const response = await fetch(`/api/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_featured: !story.is_featured,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to update';
        throw new Error(errorMessage);
      }

      fetchData();
    } catch (err: any) {
      console.error('Error toggling featured story:', err);
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

  const handleDragDropMasthead = async (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;

    const sortedImages = [...mastheadImages].sort((a, b) => (a.masthead_order ?? 999) - (b.masthead_order ?? 999));
    const draggedIndex = sortedImages.findIndex(img => img.id === draggedId);
    const targetIndex = sortedImages.findIndex(img => img.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newImages = [...sortedImages];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedItem);

    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      masthead_order: index,
    }));

    setMastheadImages(reorderedImages);

    try {
      const response = await fetch('/api/media/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'masthead',
          mediaIds: newImages.map(img => img.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder images');
      }
    } catch (err: any) {
      console.error('Error reordering images:', err);
      fetchData();
      alert('Error reordering images: ' + err.message);
    }
  };

  const handleDragDropStories = async (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;

    const sortedStories = [...featuredStories].sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999));
    const draggedIndex = sortedStories.findIndex(s => s.id === draggedId);
    const targetIndex = sortedStories.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newStories = [...sortedStories];
    const [draggedItem] = newStories.splice(draggedIndex, 1);
    newStories.splice(targetIndex, 0, draggedItem);

    const reorderedStories = newStories.map((story, index) => ({
      ...story,
      featured_order: index,
    }));

    setFeaturedStories(reorderedStories);

    try {
      const response = await fetch('/api/stories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyIds: newStories.map(s => s.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder stories');
      }
    } catch (err: any) {
      console.error('Error reordering stories:', err);
      fetchData();
      alert('Error reordering stories: ' + err.message);
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
          Configure images for the main page masthead carousel and featured stories section
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
                onToggle={handleToggleMasthead}
                onDragDrop={handleDragDropMasthead}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Featured Stories</h2>
        </div>
        <p className="text-sm text-gray-900 mb-4">
          Stories displayed in the featured section below the masthead. Each story will show its featured image.
        </p>

        {featuredStories.length === 0 ? (
          <p className="text-gray-900 text-center py-8">
            No featured stories. Mark stories as "Featured" to add them here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...featuredStories].sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999)).map((story) => (
              <DraggableStoryItem
                key={story.id}
                story={story}
                onToggle={handleToggleFeaturedStory}
                onDragDrop={handleDragDropStories}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">All Stories</h2>
        <p className="text-sm text-gray-900 mb-4">
          Click to toggle featured status
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allStories.map((story) => (
            <div key={story.id} className="relative group">
              {story.featured_image_public_id ? (
                <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                  <CldImage
                    src={story.featured_image_public_id}
                    alt={story.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  {story.is_featured && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Featured
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">No featured image</span>
                </div>
              )}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900 truncate">{story.title}</p>
                <button
                  onClick={() => handleToggleFeaturedStory(story)}
                  className={`mt-1 w-full px-2 py-1 text-xs rounded ${
                    story.is_featured
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {story.is_featured ? 'Featured' : 'Add to Featured'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">All Media</h2>
        <p className="text-sm text-gray-900 mb-4">
          Click to toggle masthead status
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
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                />
                {media.is_masthead && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Masthead
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleToggleMasthead(media)}
                className={`mt-2 w-full px-2 py-1 text-xs rounded ${
                  media.is_masthead
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {media.is_masthead ? 'Masthead' : 'Add to Masthead'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DraggableMediaItem({ media, onToggle, onDragDrop }: DraggableMediaItemProps) {
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
      <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100">
        <CldImage
          src={media.cloudinary_public_id}
          alt={media.caption || 'Masthead image'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <button
        onClick={() => onToggle(media)}
        className="mt-2 w-full px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        Remove from Masthead
      </button>
    </div>
  );
}

function DraggableStoryItem({ story, onToggle, onDragDrop }: DraggableStoryItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', story.id.toString());
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
    if (draggedId && draggedId !== story.id) {
      onDragDrop(draggedId, story.id);
    }
  };

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
      {story.featured_image_public_id ? (
        <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
          <CldImage
            src={story.featured_image_public_id}
            alt={story.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>
      ) : (
        <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-sm text-center px-2">No featured image</span>
        </div>
      )}
      <div className="mt-2">
        <p className="text-sm font-medium text-gray-900 truncate mb-1">{story.title}</p>
        <button
          onClick={() => onToggle(story)}
          className="w-full px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Remove from Featured
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Story } from '@/types';

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/stories');
      const data = await response.json();
      
      // Handle both success and error responses gracefully
      if (data.error && !data.stories) {
        console.error('API error:', data.error);
        setStories([]);
        // Only set error if it's not a "table doesn't exist" error
        if (!data.error.includes('does not exist') && !data.error.includes('relation')) {
          setError(data.error);
        }
      } else {
        setStories(data.stories || []);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setStories([]);
      // Don't set error for network errors
      if (err.message && !err.message.includes('Failed to fetch')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const response = await fetch(`/api/stories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete story');
      fetchStories();
    } catch (err: any) {
      alert('Error deleting story: ' + err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} story/stories? This action cannot be undone.`)) return;

    try {
      const response = await fetch('/api/stories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('Batch delete failed');
      setSelectedIds(new Set());
      fetchStories();
    } catch (err: any) {
      alert('Error deleting stories: ' + err.message);
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading stories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stories</h1>
          <p className="mt-2 text-sm text-gray-900">
            Manage your photojournalism stories
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              setEditingStory(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
          >
            Create Story
          </button>
        </div>
      </div>

      {stories.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedIds.size === 0 ? (
              <button
                onClick={() => setSelectedIds(new Set(stories.map(s => s.id)))}
                className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Select All
              </button>
            ) : (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear Selection
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-900">
                {selectedIds.size} story{selectedIds.size !== 1 ? 'ies' : ''} selected
              </span>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      )}

      {stories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-900">No stories yet. Create your first story!</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {stories.map((story) => (
              <li key={story.id}>
                <div className={`px-4 py-4 sm:px-6 flex items-center space-x-4 ${
                  selectedIds.has(story.id) ? 'bg-blue-50' : ''
                }`}>
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(story.id)}
                      onChange={() => toggleSelection(story.id)}
                      className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {story.title}
                      </h3>
                      {story.year && (
                        <span className="ml-2 text-sm text-gray-900">
                          ({story.year})
                        </span>
                      )}
                    </div>
                    {story.location && (
                      <p className="mt-1 text-sm text-gray-900">
                        {story.location}
                      </p>
                    )}
                    {story.narrative && (
                      <p className="mt-2 text-sm text-gray-900 line-clamp-2">
                        {story.narrative}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex space-x-2">
                    <Link
                      href={`/admin/stories/${story.id}`}
                      className="text-sm text-gray-900 hover:text-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(story.id);
                      }}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showCreateModal && (
        <StoryModal
          story={editingStory}
          onClose={() => {
            setShowCreateModal(false);
            setEditingStory(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingStory(null);
            fetchStories();
          }}
        />
      )}
    </div>
  );
}

function StoryModal({
  story,
  onClose,
  onSave,
}: {
  story: Story | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: story?.title || '',
    year: story?.year?.toString() || '',
    location: story?.location || '',
    narrative: story?.narrative || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    console.log('Selected files:', files.length);
    setImageFiles(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.onerror = () => {
        console.error('Error reading file:', file.name);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Compress image on client side before upload
    const { compressImage } = await import('@/lib/image-compression');
    console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);
    const compressedFile = await compressImage(file, {
      maxSizeMB: 3.0, // More conservative
      maxWidthOrHeight: 2500, // Smaller max dimension
      quality: 0.80, // Lower quality for better compression
    });
    console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Double-check size before upload
    if (compressedFile.size > 4 * 1024 * 1024) {
      throw new Error(`File is still too large after compression: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB. Please use a smaller image.`);
    }

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder', 'portfolio');

    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.media.cloudinary_public_id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadingImages(true);

    try {
      // First, create or update the story
      const url = story ? `/api/stories/${story.id}` : '/api/stories';
      const method = story ? 'PUT' : 'POST';
      const body = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save story (${response.status})`);
      }

      const storyData = await response.json();
      const storyId = story?.id || storyData.story.id;

      // Upload images and add them to the story
      if (imageFiles.length > 0) {
        console.log(`Uploading ${imageFiles.length} images to story ${storyId}`);
        
        // Get current max order_index if editing existing story
        let startOrderIndex = 0;
        if (story) {
          try {
            const imagesResponse = await fetch(`/api/stories/${storyId}`);
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              const existingImages = imagesData.images || [];
              if (existingImages.length > 0) {
                startOrderIndex = Math.max(...existingImages.map((img: any) => img.order_index || 0)) + 1;
              }
            }
          } catch (err) {
            // If we can't get existing images, start from 0
            console.warn('Could not fetch existing images for order index');
          }
        }

        const uploadResults = [];
        for (let i = 0; i < imageFiles.length; i++) {
          try {
            console.log(`Uploading image ${i + 1}/${imageFiles.length}: ${imageFiles[i].name}`);
            const publicId = await uploadImage(imageFiles[i]);
            console.log(`Uploaded successfully, public_id: ${publicId}`);
            
            // Add image to story
            const addResponse = await fetch(`/api/stories/${storyId}/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cloudinary_public_id: publicId,
                order_index: startOrderIndex + i,
              }),
            });
            
            if (!addResponse.ok) {
              const errorData = await addResponse.json().catch(() => ({}));
              throw new Error(errorData.error || 'Failed to add image to story');
            }
            
            uploadResults.push({ success: true, index: i });
          } catch (err: any) {
            console.error(`Failed to upload image ${i + 1}:`, err);
            uploadResults.push({ success: false, index: i, error: err.message });
            // Continue with other images even if one fails
          }
        }
        
        const successCount = uploadResults.filter(r => r.success).length;
        if (successCount < imageFiles.length) {
          alert(`Uploaded ${successCount} of ${imageFiles.length} images. Some images failed to upload.`);
        } else {
          console.log(`Successfully uploaded all ${imageFiles.length} images`);
        }
      }
      
      // Wait a moment for the database to be ready, then refresh
      await new Promise(resolve => setTimeout(resolve, 100));
      onSave();
    } catch (err: any) {
      alert('Error saving story: ' + err.message);
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {story ? 'Edit Story' : 'Create Story'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Narrative
                </label>
                <textarea
                  rows={4}
                  value={formData.narrative}
                  onChange={(e) =>
                    setFormData({ ...formData, narrative: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                />
              </div>
              <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Images <span className="text-gray-900 font-normal">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800 cursor-pointer"
                    id="story-image-upload"
                  />
                  <p className="mt-2 text-xs text-gray-900">
                    Select one or more images to upload. Images will be automatically added to this story.
                  </p>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Selected Images ({imagePreviews.length}):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingImages}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {uploadingImages ? 'Uploading images...' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


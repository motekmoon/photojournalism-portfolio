'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CldImage } from 'next-cloudinary';
import type { Story, StoryImage, Media } from '@/types';

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [story, setStory] = useState<Story | null>(null);
  const [images, setImages] = useState<StoryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    year: '',
    location: '',
    narrative: '',
    featured_image_public_id: '',
  });
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<Media[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchStory();
    fetchAvailableMedia();
  }, [id]);

  const fetchStory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stories/${id}`);
      if (!response.ok) throw new Error('Failed to fetch story');
      const data = await response.json();
      setStory(data.story);
      setImages(data.images || []);
      setFormData({
        title: data.story.title || '',
        year: data.story.year?.toString() || '',
        location: data.story.location || '',
        narrative: data.story.narrative || '',
        featured_image_public_id: data.story.featured_image_public_id || '',
      });
    } catch (err: any) {
      alert('Error loading story: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMedia = async () => {
    try {
      const response = await fetch('/api/media');
      if (!response.ok) return;
      const data = await response.json();
      setAvailableMedia(data.media || []);
    } catch (err) {
      // Silently fail
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/stories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: formData.year ? parseInt(formData.year) : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save story');
      fetchStory();
    } catch (err: any) {
      alert('Error saving story: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async (media: Media) => {
    try {
      const nextOrderIndex = images.length > 0 
        ? Math.max(...images.map(img => img.order_index)) + 1 
        : 0;
      
      const response = await fetch(`/api/stories/${id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cloudinary_public_id: media.cloudinary_public_id,
          caption: media.caption,
          order_index: nextOrderIndex,
        }),
      });

      if (!response.ok) throw new Error('Failed to add image');
      setShowAddImageModal(false);
      fetchStory();
    } catch (err: any) {
      alert('Error adding image: ' + err.message);
    }
  };

  const handleRemoveImage = async (imageId: number) => {
    if (!confirm('Remove this image from the story?')) return;

    try {
      const response = await fetch(`/api/stories/${id}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove image');
      fetchStory();
    } catch (err: any) {
      alert('Error removing image: ' + err.message);
    }
  };

  const handleUpdateCaption = async (imageId: number, caption: string) => {
    try {
      // We need to add an API endpoint for updating image captions
      // For now, we'll update the order endpoint to also handle captions
      const image = images.find(img => img.id === imageId);
      if (!image) return;

      const response = await fetch(`/api/stories/${id}/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{ id: imageId, order_index: image.order_index, caption }],
        }),
      });

      if (!response.ok) throw new Error('Failed to update caption');
      fetchStory();
    } catch (err: any) {
      alert('Error updating caption: ' + err.message);
    }
  };

  const handleMoveImage = async (imageId: number, direction: 'up' | 'down') => {
    const sortedImages = [...images].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedImages.findIndex(img => img.id === imageId);
    
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedImages.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentImage = sortedImages[currentIndex];
    const targetImage = sortedImages[newIndex];

    // Swap order indices
    const updates = [
      { id: currentImage.id, order_index: targetImage.order_index },
      { id: targetImage.id, order_index: currentImage.order_index },
    ];

    // Optimistically update local state immediately (no page refresh)
    const reorderedImages = [...sortedImages];
    reorderedImages[currentIndex] = { ...currentImage, order_index: targetImage.order_index };
    reorderedImages[newIndex] = { ...targetImage, order_index: currentImage.order_index };
    setImages(reorderedImages);

    try {
      const response = await fetch(`/api/stories/${id}/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updates }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder images');
      }
      // Success - no need to refetch since we've already updated the UI optimistically
    } catch (err: any) {
      console.error('Error reordering images:', err);
      // Revert to original order on error by refetching
      fetchStory();
      alert('Error reordering images: ' + err.message);
    }
  };

  const handleSetFeaturedImage = (publicId: string) => {
    setFormData({ ...formData, featured_image_public_id: publicId });
  };

  const handleBatchDeleteImages = async () => {
    if (selectedImageIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedImageIds.size} image(s) from this story?`)) return;

    try {
      const response = await fetch(`/api/stories/${id}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selectedImageIds) }),
      });

      if (!response.ok) throw new Error('Batch delete failed');
      setSelectedImageIds(new Set());
      fetchStory();
    } catch (err: any) {
      alert('Error deleting images: ' + err.message);
    }
  };

  const toggleImageSelection = (imageId: number) => {
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImageIds(newSelected);
  };

  const handleDragDrop = async (draggedImageId: number, targetImageId: number) => {
    if (draggedImageId === targetImageId) return;

    const sortedImages = [...images].sort((a, b) => a.order_index - b.order_index);
    const draggedIndex = sortedImages.findIndex(img => img.id === draggedImageId);
    const targetIndex = sortedImages.findIndex(img => img.id === targetImageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order by moving dragged item to target position
    const newImages = [...sortedImages];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedItem);

    // Update order_index for all affected images
    const updates = newImages.map((img, index) => ({
      id: img.id,
      order_index: index,
    }));

    // Optimistically update local state immediately (no page refresh)
    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      order_index: index,
    }));
    setImages(reorderedImages);

    try {
      const response = await fetch(`/api/stories/${id}/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updates }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder images');
      }
      // Success - no need to refetch since we've already updated the UI optimistically
    } catch (err: any) {
      console.error('Error reordering images:', err);
      // Revert to original order on error by refetching
      fetchStory();
      alert('Error reordering images: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading story...</div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Story not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/stories"
          className="text-sm text-gray-900 hover:text-gray-900"
        >
          ← Back to Stories
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Story Details</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900">
                Narrative
              </label>
              <textarea
                rows={6}
                value={formData.narrative}
                onChange={(e) =>
                  setFormData({ ...formData, narrative: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Featured Image
              </label>
              {formData.featured_image_public_id ? (
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                    <CldImage
                      src={formData.featured_image_public_id}
                      alt="Featured"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.featured_image_public_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          featured_image_public_id: e.target.value,
                        })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm text-gray-900"
                      placeholder="portfolio/image-name"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, featured_image_public_id: '' })}
                      className="mt-1 text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.featured_image_public_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      featured_image_public_id: e.target.value,
                    })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                  placeholder="portfolio/image-name or select from story images below"
                />
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Story Images</h2>
          <div className="flex space-x-2">
            <UploadImageButton storyId={id} currentImageCount={images.length} onUploadComplete={fetchStory} />
            <button
              onClick={() => setShowAddImageModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              Add from Library
            </button>
          </div>
        </div>

        {images.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedImageIds.size === 0 ? (
                <button
                  onClick={() => setSelectedImageIds(new Set(images.map(img => img.id)))}
                  className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Select All
                </button>
              ) : (
                <button
                  onClick={() => setSelectedImageIds(new Set())}
                  className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedImageIds.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">
                  {selectedImageIds.size} image{selectedImageIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={handleBatchDeleteImages}
                  className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        )}

        {images.length === 0 ? (
          <p className="text-gray-900 text-center py-8">
            No images in this story yet. Add images from your media library.
          </p>
        ) : (
          <div className="space-y-4">
            {[...images].sort((a, b) => a.order_index - b.order_index).map((image, index) => (
              <ImageItem
                key={image.id}
                image={image}
                index={index}
                totalImages={images.length}
                isFeatured={formData.featured_image_public_id === image.cloudinary_public_id}
                isSelected={selectedImageIds.has(image.id)}
                onRemove={() => handleRemoveImage(image.id)}
                onMoveUp={() => handleMoveImage(image.id, 'up')}
                onMoveDown={() => handleMoveImage(image.id, 'down')}
                onUpdateCaption={(caption) => handleUpdateCaption(image.id, caption)}
                onSetFeatured={() => handleSetFeaturedImage(image.cloudinary_public_id)}
                onToggleSelection={() => toggleImageSelection(image.id)}
                onDragDrop={handleDragDrop}
              />
            ))}
          </div>
        )}
      </div>

      {showAddImageModal && (
        <AddImageModal
          availableMedia={availableMedia.filter(
            (m) => !images.some((img) => img.cloudinary_public_id === m.cloudinary_public_id)
          )}
          onAdd={handleAddImage}
          onClose={() => setShowAddImageModal(false)}
        />
      )}
    </div>
  );
}

function UploadImageButton({
  storyId,
  currentImageCount,
  onUploadComplete,
}: {
  storyId: string;
  currentImageCount: number;
  onUploadComplete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      
      // Generate previews for all files
      const newPreviews: string[] = [];
      let loadedCount = 0;
      
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          loadedCount++;
          if (loadedCount === selectedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    const errors: string[] = [];
    let successCount = 0;
    let nextOrderIndex = currentImageCount;

    try {
      // Get current max order_index
      try {
        const storyResponse = await fetch(`/api/stories/${storyId}`);
        if (storyResponse.ok) {
          const storyData = await storyResponse.json();
          const existingImages = storyData.images || [];
          if (existingImages.length > 0) {
            nextOrderIndex = Math.max(...existingImages.map((img: any) => img.order_index || 0)) + 1;
          }
        }
      } catch (err) {
        // Use current count as fallback
        nextOrderIndex = currentImageCount;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        try {
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

          // Upload to Cloudinary
          const formData = new FormData();
          formData.append('file', compressedFile);
          formData.append('folder', 'portfolio');

          const uploadResponse = await fetch('/api/cloudinary/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Upload failed');
          }

          const uploadData = await uploadResponse.json();
          const publicId = uploadData.media.cloudinary_public_id;

          // Add to story
          const addResponse = await fetch(`/api/stories/${storyId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cloudinary_public_id: publicId,
              caption: uploadData.media.caption,
              order_index: nextOrderIndex + i,
            }),
          });

          if (!addResponse.ok) {
            const errorData = await addResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to add image to story');
          }

          successCount++;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          errors.push(`${file.name}: ${err.message || 'Unknown error'}`);
        }
      }

      // Show results
      if (errors.length > 0) {
        alert(
          `Upload complete!\n\n` +
          `Successfully uploaded: ${successCount} file(s)\n` +
          `Failed: ${errors.length} file(s)\n\n` +
          `Errors:\n${errors.join('\n')}`
        );
      } else {
        setShowUpload(false);
        setFiles([]);
        setPreviews([]);
        if (files.length > 1) {
          alert(`Successfully uploaded ${successCount} image(s) to story!`);
        }
      }

      onUploadComplete();
    } catch (err: any) {
      alert('Error during batch upload: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  if (showUpload) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Upload Images to Story {files.length > 0 && `(${files.length} selected)`}
            </h3>
            <button
              onClick={() => {
                setShowUpload(false);
                setFiles([]);
                setPreviews([]);
              }}
              className="text-gray-900 hover:text-gray-900"
            >
              ×
            </button>
          </div>
          {uploading && uploadProgress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-900 mb-1">
                <span>Uploading {uploadProgress.current} of {uploadProgress.total}</span>
                <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Select Images (multiple files supported)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800"
              />
            </div>
            {previews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <p className="text-xs text-gray-900 mt-1 truncate">{files[index].name}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setFiles([]);
                  setPreviews([]);
                }}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {uploading 
                  ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                  : `Upload & Add ${files.length} Image${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowUpload(true)}
      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50"
    >
      Upload Image
    </button>
  );
}

function ImageItem({
  image,
  index,
  totalImages,
  isFeatured,
  isSelected,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateCaption,
  onSetFeatured,
  onToggleSelection,
  onDragDrop,
}: {
  image: StoryImage;
  index: number;
  totalImages: number;
  isFeatured: boolean;
  isSelected: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateCaption: (caption: string) => void;
  onSetFeatured: () => void;
  onToggleSelection: () => void;
  onDragDrop: (draggedImageId: number, targetImageId: number) => void;
}) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(image.caption || '');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleCaptionBlur = () => {
    if (caption !== image.caption) {
      onUpdateCaption(caption);
    }
    setEditingCaption(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', image.id.toString());
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
    const draggedImageId = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedImageId && draggedImageId !== image.id && onDragDrop) {
      onDragDrop(draggedImageId, image.id);
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
      className={`flex items-center space-x-4 p-4 border rounded-lg cursor-move transition-all ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
      } ${
        isDragging ? 'opacity-50' : ''
      } ${
        dragOver ? 'border-blue-500 bg-blue-100 border-2' : ''
      }`}
    >
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex flex-col space-y-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={index === 0}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-900 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Move up"
        >
          ↑
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={index === totalImages - 1}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-900 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Move down"
        >
          ↓
        </button>
      </div>
      <div className="flex-shrink-0 text-gray-400 text-xs" title="Drag to reorder">
        ⋮⋮
      </div>
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <CldImage
          src={image.cloudinary_public_id}
          alt={image.caption || `Image ${index + 1}`}
          fill
          className="object-cover"
        />
        {isFeatured && (
          <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 rounded">
            Featured
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs text-gray-900">Order: {image.order_index}</span>
          {!isFeatured && (
            <button
              onClick={onSetFeatured}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Set as Featured
            </button>
          )}
        </div>
        {editingCaption ? (
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={handleCaptionBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCaptionBlur();
              if (e.key === 'Escape') {
                setCaption(image.caption || '');
                setEditingCaption(false);
              }
            }}
            className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingCaption(true)}
            className="text-sm text-gray-900 cursor-text hover:bg-gray-100 p-1 rounded min-h-[24px]"
          >
            {image.caption || <span className="text-gray-900 italic">Click to add caption</span>}
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        Remove
      </button>
    </div>
  );
}

function AddImageModal({
  availableMedia,
  onAdd,
  onClose,
}: {
  availableMedia: Media[];
  onAdd: (media: Media) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Add Image to Story
          </h3>
          <button
            onClick={onClose}
            className="text-gray-900 hover:text-gray-900"
          >
            ×
          </button>
        </div>
        {availableMedia.length === 0 ? (
          <p className="text-gray-900 text-center py-8">
            No available media. Upload images in the Media Library first.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {availableMedia.map((media) => (
              <button
                key={media.id}
                onClick={() => onAdd(media)}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 ring-gray-900 transition-all"
              >
                <CldImage
                  src={media.cloudinary_public_id}
                  alt={media.caption || 'Media'}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CldImage } from 'next-cloudinary';
import type { Media } from '@/types';
import { compressImage } from '@/lib/image-compression';

export default function MediaPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'featured' | 'masthead'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchMedia();
  }, [filter]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      let url = '/api/media';
      if (filter === 'featured') url += '?is_featured=true';
      if (filter === 'masthead') url += '?is_masthead=true';

      const response = await fetch(url);
      const data = await response.json();
      
      // Handle both success and error responses gracefully
      if (data.error && !data.media) {
        console.error('API error:', data.error);
        // Still set empty array to show empty state
        setMedia([]);
        // Only show alert if it's not a "table doesn't exist" error
        if (!data.error.includes('does not exist') && !data.error.includes('relation')) {
          alert('Error loading media: ' + data.error);
        }
      } else {
        setMedia(data.media || []);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      // Set empty array on error to show empty state
      setMedia([]);
      // Don't show alert for network errors, just log them
      if (err.message && !err.message.includes('Failed to fetch')) {
        alert('Error loading media: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        try {
          // Compress image on client side before upload
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

          console.log(`Starting upload ${i + 1}/${files.length} for file:`, file.name, 'Size:', file.size);

          const response = await fetch('/api/cloudinary/upload', {
            method: 'POST',
            body: formData,
          });

          let responseData;
          try {
            const text = await response.text();
            responseData = JSON.parse(text);
          } catch (parseError: any) {
            console.error('Failed to parse response as JSON:', parseError);
            errors.push(`${file.name}: Invalid server response`);
            continue;
          }

          if (!response.ok) {
            const errorMessage = responseData.error || `Upload failed with status ${response.status}`;
            console.error(`Upload error for ${file.name}:`, errorMessage);
            errors.push(`${file.name}: ${errorMessage}`);
            continue;
          }

          console.log(`Upload successful for ${file.name}!`);
          successCount++;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          errors.push(`${file.name}: ${err.message || 'Unknown error'}`);
        }
      }

      // Refresh media list
      fetchMedia();

      // Show results
      if (errors.length > 0) {
        alert(
          `Upload complete!\n\n` +
          `Successfully uploaded: ${successCount} file(s)\n` +
          `Failed: ${errors.length} file(s)\n\n` +
          `Errors:\n${errors.join('\n')}`
        );
      } else {
        setShowUploadModal(false);
        if (files.length > 1) {
          alert(`Successfully uploaded ${successCount} image(s)!`);
        }
      }
    } catch (err: any) {
      console.error('Batch upload error:', err);
      alert('Error during batch upload: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleBatchUpdate = async (updates: Partial<Media>) => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch('/api/media/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates,
        }),
      });

      if (!response.ok) throw new Error('Batch update failed');
      setSelectedIds(new Set());
      fetchMedia();
    } catch (err: any) {
      alert('Error updating media: ' + err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;

    try {
      const response = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('Delete failed');
      setSelectedIds(new Set());
      fetchMedia();
    } catch (err: any) {
      alert('Error deleting media: ' + err.message);
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

  const handleUpdateCaption = async (id: number, caption: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });

      if (!response.ok) throw new Error('Failed to update caption');
      fetchMedia();
    } catch (err: any) {
      alert('Error updating caption: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading media...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="mt-2 text-sm text-gray-900">
            Manage your images and media files
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
          >
            Upload Image
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-900 border border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('featured')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'featured'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-900 border border-gray-300'
              }`}
            >
              Featured
            </button>
            <button
              onClick={() => setFilter('masthead')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'masthead'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-900 border border-gray-300'
              }`}
            >
              Masthead
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {media.length > 0 && (
              <>
                {selectedIds.size === 0 ? (
                  <button
                    onClick={() => setSelectedIds(new Set(media.map(m => m.id)))}
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
              </>
            )}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">
                  {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBatchUpdate({ is_featured: true })}
                    className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Mark Featured
                  </button>
                  <button
                    onClick={() => handleBatchUpdate({ is_masthead: true })}
                    className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Mark Masthead
                  </button>
                  <button
                    onClick={() => handleBatchUpdate({ is_featured: false, is_masthead: false })}
                    className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Clear Flags
                  </button>
                </div>
              </div>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {media.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-900">No media yet. Upload your first image!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <MediaItem
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              onToggleSelection={() => toggleSelection(item.id)}
              onUpdateCaption={(caption) => handleUpdateCaption(item.id, caption)}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          onUpload={handleUpload}
          onClose={() => setShowUploadModal(false)}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      )}
    </div>
  );
}

function MediaItem({
  item,
  isSelected,
  onToggleSelection,
  onUpdateCaption,
}: {
  item: Media;
  isSelected: boolean;
  onToggleSelection: () => void;
  onUpdateCaption: (caption: string) => void;
}) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(item.caption || '');

  const handleCaptionBlur = () => {
    if (caption !== item.caption) {
      onUpdateCaption(caption);
    }
    setEditingCaption(false);
  };

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 ${
        isSelected
          ? 'border-gray-900'
          : 'border-transparent hover:border-gray-300'
      }`}
    >
      <div
        className="aspect-square relative bg-gray-100 block cursor-pointer"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            // Allow Ctrl/Cmd+click to open in new tab
            window.open(`/admin/media/${item.id}`, '_blank');
            return;
          }
          // Regular click toggles selection
          onToggleSelection();
        }}
      >
        <CldImage
          src={item.cloudinary_public_id}
          alt={item.caption || 'Media'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {isSelected && (
          <div className="absolute top-2 right-2 bg-gray-900 text-white rounded-full w-6 h-6 flex items-center justify-center z-10">
            ✓
          </div>
        )}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/admin/media/${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-gray-900 text-xs px-2 py-1 rounded shadow"
          >
            View Details
          </Link>
        </div>
      </div>
      <div className="p-2 bg-white">
        {editingCaption ? (
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={handleCaptionBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCaptionBlur();
              if (e.key === 'Escape') {
                setCaption(item.caption || '');
                setEditingCaption(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
            autoFocus
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setEditingCaption(true);
            }}
            className="text-xs text-gray-900 cursor-text hover:bg-gray-100 p-1 rounded min-h-[20px]"
          >
            {item.caption || <span className="text-gray-900 italic">Click to add caption</span>}
          </div>
        )}
        <div className="flex items-center space-x-2 mt-1">
          {item.is_featured && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
              Featured
            </span>
          )}
          {item.is_masthead && (
            <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
              Masthead
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadModal({
  onUpload,
  onClose,
  uploading,
  uploadProgress,
}: {
  onUpload: (files: File[]) => void;
  onClose: () => void;
  uploading: boolean;
  uploadProgress: { current: number; total: number };
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      onUpload(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upload Images {files.length > 0 && `(${files.length} selected)`}
          </h3>
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
          <form onSubmit={handleSubmit}>
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
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={files.length === 0 || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {uploading 
                  ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                  : `Upload ${files.length} Image${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CldImage } from 'next-cloudinary';
import type { Media } from '@/types';

export default function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState('');
  const [editingCaption, setEditingCaption] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, [id]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/media/${id}`);
      if (!response.ok) throw new Error('Failed to fetch media');
      const data = await response.json();
      setMedia(data.media);
      setCaption(data.media.caption || '');
    } catch (err: any) {
      alert('Error loading media: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCaption = async () => {
    if (!media) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });

      if (!response.ok) throw new Error('Failed to save caption');
      setEditingCaption(false);
      fetchMedia();
    } catch (err: any) {
      alert('Error saving caption: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this media item?')) return;

    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      router.push('/admin/media');
    } catch (err: any) {
      alert('Error deleting media: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading media...</div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Media not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/media"
          className="text-sm text-gray-900 hover:text-gray-900"
        >
          ← Back to Media Library
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Image</h2>
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <CldImage
              src={media.cloudinary_public_id}
              alt={media.caption || 'Media'}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Caption
                </label>
                {editingCaption ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveCaption}
                        disabled={saving}
                        className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setCaption(media.caption || '');
                          setEditingCaption(false);
                        }}
                        className="px-3 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingCaption(true)}
                    className="text-sm text-gray-900 cursor-text hover:bg-gray-100 p-2 rounded min-h-[60px] border border-gray-200"
                  >
                    {media.caption || <span className="text-gray-900 italic">Click to add caption</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Cloudinary Public ID
                </label>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                  {media.cloudinary_public_id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Status
                </label>
                <div className="flex space-x-2">
                  {media.is_featured && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                  {media.is_masthead && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Masthead
                    </span>
                  )}
                  {!media.is_featured && !media.is_masthead && (
                    <span className="text-xs text-gray-900">No special status</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(media.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {(media.exif_data || media.iptc_data || media.all_metadata) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Extracted Metadata</h2>
              
              {/* Info about metadata extraction */}
              {media.all_metadata && (!media.all_metadata.exif || Object.keys(media.all_metadata.exif).length === 0) && (!media.all_metadata.iptc || Object.keys(media.all_metadata.iptc).length === 0) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-900">
                    <strong>Note:</strong> This image does not contain embedded EXIF/IPTC/XMP metadata. 
                    The system extracted all available metadata from Cloudinary (colors, faces, quality analysis, etc.), 
                    but the original image file appears to have been processed or exported without preserving camera metadata.
                  </p>
                </div>
              )}
              
              {/* Show ALL Metadata first if available */}
              {media.all_metadata && Object.keys(media.all_metadata).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Metadata (Complete)</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(media.all_metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Show individual sections for easier reading */}
              {media.all_metadata?.exif && Object.keys(media.all_metadata.exif).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">EXIF Data</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.all_metadata.exif, null, 2)}
                  </pre>
                </div>
              )}
              
              {media.all_metadata?.iptc && Object.keys(media.all_metadata.iptc).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">IPTC Data</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.all_metadata.iptc, null, 2)}
                  </pre>
                </div>
              )}
              
              {media.all_metadata?.xmp && Object.keys(media.all_metadata.xmp).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">XMP Data</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.all_metadata.xmp, null, 2)}
                  </pre>
                </div>
              )}
              
              {media.all_metadata?.gps && Object.keys(media.all_metadata.gps).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">GPS Data</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.all_metadata.gps, null, 2)}
                  </pre>
                </div>
              )}
              
              {media.all_metadata?.colors && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Color Analysis</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.all_metadata.colors, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Face Detection</h3>
                {media.all_metadata?.faces ? (
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.all_metadata.faces, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    Face detection is disabled. No face data available.
                  </p>
                )}
              </div>
              
              {/* Fallback to old format if all_metadata not available */}
              {!media.all_metadata && media.iptc_data && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">IPTC Data</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.iptc_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!media.all_metadata && media.exif_data && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">EXIF Data</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(media.exif_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Actions</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete Media
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


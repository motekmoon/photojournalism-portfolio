'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { CldImage } from 'next-cloudinary';

export default function AboutPageEditor() {
  const [content, setContent] = useState('');
  const [profileImagePublicId, setProfileImagePublicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pages?slug=about');
      if (!response.ok) throw new Error('Failed to fetch page');
      const data = await response.json();
      setContent(data.page?.content || '');
      setProfileImagePublicId(data.page?.profile_image_public_id || null);
    } catch (err: any) {
      // Page might not exist yet, that's okay
      setContent('');
      setProfileImagePublicId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
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
      setProfileImagePublicId(uploadData.media.cloudinary_public_id);

      // Auto-save the profile image
      const saveResponse = await fetch('/api/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'about',
          content,
          profile_image_public_id: uploadData.media.cloudinary_public_id,
        }),
      });

      if (!saveResponse.ok) throw new Error('Failed to save profile image');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Error uploading profile image: ' + err.message);
    } finally {
      setUploadingProfile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!confirm('Remove profile picture?')) return;

    try {
      const response = await fetch('/api/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'about',
          content,
          profile_image_public_id: null,
        }),
      });

      if (!response.ok) throw new Error('Failed to remove profile image');
      setProfileImagePublicId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Error removing profile image: ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'about',
          content,
          profile_image_public_id: profileImagePublicId,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
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
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">About Page Editor</h1>
        <p className="mt-2 text-sm text-gray-900">
          Edit the content for the about page. Supports Markdown formatting.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Profile Picture
          </label>
          <div className="flex items-start gap-4">
            {profileImagePublicId ? (
              <div className="relative">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300">
                  <CldImage
                    src={profileImagePublicId}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveProfileImage}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700"
                  title="Remove profile picture"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-gray-400 text-xs text-center px-2">No image</span>
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageUpload}
                disabled={uploadingProfile}
                className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800 disabled:opacity-50"
              />
              {uploadingProfile && (
                <p className="mt-2 text-sm text-gray-600">Uploading...</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Upload a square profile picture. Recommended size: 400x400px or larger.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Content (Markdown supported)
          </label>
          <textarea
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 font-mono text-sm text-gray-900"
            placeholder="Enter your about page content here. You can use Markdown formatting..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-900">
            {saved && (
              <span className="text-green-600 font-medium">✓ Saved successfully!</span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Preview</h2>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          {profileImagePublicId && (
            <div className="mb-8 flex justify-center">
              <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
                <CldImage
                  src={profileImagePublicId}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>
            </div>
          )}
          {content ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-3xl font-semibold text-gray-900 mt-6 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-2xl font-semibold text-gray-900 mt-5 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-lg text-gray-700 mb-4 leading-relaxed">{children}</p>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-gray-900 underline hover:text-gray-600"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-700 my-4 space-y-2 pl-6">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-700 my-4 space-y-2 pl-6">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-lg leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 my-6 text-gray-600 italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-gray-900 font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm text-gray-900 font-mono my-6">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-6">{children}</pre>
                ),
                img: ({ src, alt }) => (
                  <img
                    src={src || ''}
                    alt={alt || ''}
                    className="max-w-full h-auto my-6 rounded-lg"
                  />
                ),
                hr: () => (
                  <hr className="border-0 border-t border-gray-300 my-8" />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-500 italic">No content yet. Start typing to see a preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}


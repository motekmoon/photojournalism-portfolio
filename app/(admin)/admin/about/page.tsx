'use client';

import { useState, useEffect } from 'react';

export default function AboutPageEditor() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    } catch (err: any) {
      // Page might not exist yet, that's okay
      setContent('');
    } finally {
      setLoading(false);
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
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Preview</h2>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-900">
            {content || <span className="text-gray-900 italic">No content yet. Start typing to see a preview.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}


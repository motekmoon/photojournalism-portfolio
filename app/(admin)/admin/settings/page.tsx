'use client';

import { useState, useEffect } from 'react';

interface Setting {
  key: string;
  value: any;
  updated_at: Date;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Fetch common settings
      const keys = ['site_title', 'site_description', 'contact_email', 'social_links'];
      const fetchedSettings: Record<string, any> = {};

      for (const key of keys) {
        try {
          const response = await fetch(`/api/settings?key=${key}`);
          if (response.ok) {
            const data = await response.json();
            if (data.setting) {
              fetchedSettings[key] = data.setting.value;
            }
          }
        } catch (err) {
          // Ignore individual setting fetch errors
        }
      }

      setSettings(fetchedSettings);
    } catch (err: any) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) throw new Error('Failed to save setting');
      const data = await response.json();
      setSettings(prev => ({ ...prev, [key]: value }));
      setLastSaved(new Date().toLocaleString());
    } catch (err: any) {
      alert('Error saving setting: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-900">
            Manage site-wide settings and configuration
          </p>
        </div>
        {lastSaved && (
          <span className="text-sm text-gray-900">Last saved: {lastSaved}</span>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Site Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Site Title
              </label>
              <input
                type="text"
                value={settings.site_title || ''}
                onChange={(e) => handleInputChange('site_title', e.target.value)}
                onBlur={(e) => handleSave('site_title', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                placeholder="My Photojournalism Portfolio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Site Description
              </label>
              <textarea
                rows={3}
                value={settings.site_description || ''}
                onChange={(e) => handleInputChange('site_description', e.target.value)}
                onBlur={(e) => handleSave('site_description', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                placeholder="A collection of photojournalism stories..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={settings.contact_email || ''}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                onBlur={(e) => handleSave('contact_email', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                placeholder="contact@example.com"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Social Links</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Instagram
              </label>
              <input
                type="url"
                value={settings.social_links?.instagram || ''}
                onChange={(e) => {
                  const socialLinks = settings.social_links || {};
                  handleInputChange('social_links', { ...socialLinks, instagram: e.target.value });
                }}
                onBlur={(e) => handleSave('social_links', settings.social_links || {})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                placeholder="https://instagram.com/username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Twitter/X
              </label>
              <input
                type="url"
                value={settings.social_links?.twitter || ''}
                onChange={(e) => {
                  const socialLinks = settings.social_links || {};
                  handleInputChange('social_links', { ...socialLinks, twitter: e.target.value });
                }}
                onBlur={(e) => handleSave('social_links', settings.social_links || {})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                placeholder="https://twitter.com/username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Website
              </label>
              <input
                type="url"
                value={settings.social_links?.website || ''}
                onChange={(e) => {
                  const socialLinks = settings.social_links || {};
                  handleInputChange('social_links', { ...socialLinks, website: e.target.value });
                }}
                onBlur={(e) => handleSave('social_links', settings.social_links || {})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


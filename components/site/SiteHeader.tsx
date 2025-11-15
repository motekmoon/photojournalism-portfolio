'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Story } from '@/types';

export default function SiteHeader() {
  const [isStoriesDropdownOpen, setIsStoriesDropdownOpen] = useState(false);
  const [featuredStories, setFeaturedStories] = useState<Story[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/stories?is_featured=true')
      .then((res) => res.json())
      .then((data) => {
        setFeaturedStories(data.stories || []);
      })
      .catch((err) => {
        console.error('Error fetching featured stories:', err);
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStoriesDropdownOpen(false);
      }
    };

    if (isStoriesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStoriesDropdownOpen]);

  return (
    <header className="sticky top-0 z-50 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-8">
          <Link href="/" className="flex items-center h-full">
            <Image
              src="/zuschuss-logo.PNG"
              alt="ZUSCHUSS"
              width={120}
              height={26}
              className="h-[26px] w-auto object-contain"
              priority
            />
          </Link>
          
          <nav className="flex items-center gap-8">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsStoriesDropdownOpen(!isStoriesDropdownOpen)}
                className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 text-sm font-medium"
              >
                Stories
              </button>

              {isStoriesDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 border border-gray-200 max-h-96 overflow-y-auto">
                  {featuredStories.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No featured stories</div>
                  ) : (
                    featuredStories
                      .sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999))
                      .map((story) => (
                        <Link
                          key={story.id}
                          href={`/stories/${story.slug}`}
                          className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                          onClick={() => setIsStoriesDropdownOpen(false)}
                        >
                          {story.title}
                        </Link>
                      ))
                  )}
                </div>
              )}
            </div>
            
            <Link
              href="/about"
              className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 text-sm font-medium"
            >
              About
            </Link>

            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://bsky.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Bluesky"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 600 530">
                  <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/>
                </svg>
              </a>
              <a
                href="https://substack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Substack"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
                </svg>
              </a>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}


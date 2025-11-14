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
          </nav>
        </div>
      </div>
    </header>
  );
}


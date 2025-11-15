'use client';

import { CldImage } from 'next-cloudinary';
import type { Story, StoryImage } from '@/types';

interface StoryFeaturedImageAltProps {
  image: StoryImage;
  story: Story;
}

export default function StoryFeaturedImageAlt({ image, story }: StoryFeaturedImageAltProps) {
  return (
    <div className="relative w-full aspect-[3/2] bg-black">
      <CldImage
        src={image.cloudinary_public_id}
        alt={story.title}
        fill
        className="object-contain"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20">
        <div className="absolute left-0 right-0 p-8 sm:p-12 md:p-16 lg:p-20" style={{ bottom: '100px' }}>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
            {story.title}
          </h1>
          
          <div className="flex items-center justify-between">
            {(story.year || story.location) && (
              <div className="flex flex-wrap gap-4 text-white text-lg sm:text-xl">
                {story.year && (
                  <span>{story.year}</span>
                )}
                {story.location && (
                  <span>
                    {story.year && ' • '}
                    {story.location}
                  </span>
                )}
              </div>
            )}
            
            {/* Scroll down arrow */}
            <div className="flex-1 flex justify-center">
              <svg 
                className="w-6 h-6 text-white animate-bounce" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


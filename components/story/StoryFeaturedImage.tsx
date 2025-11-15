'use client';

import { CldImage } from 'next-cloudinary';
import type { Story, StoryImage } from '@/types';

interface StoryFeaturedImageProps {
  image: StoryImage;
  story: Story;
}

export default function StoryFeaturedImage({ image, story }: StoryFeaturedImageProps) {
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
        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 md:p-16 lg:p-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {story.title}
          </h1>
          
          {(story.year || story.location) && (
            <div className="flex flex-wrap gap-4 text-white text-lg sm:text-xl mb-6">
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

          {story.narrative && (
            <div className="max-w-3xl">
              <p className="text-white text-base sm:text-lg leading-relaxed whitespace-pre-line">
                {story.narrative}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


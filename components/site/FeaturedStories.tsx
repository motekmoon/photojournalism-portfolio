'use client';

import { CldImage } from 'next-cloudinary';
import Link from 'next/link';
import type { Story } from '@/types';

interface FeaturedStoriesProps {
  stories: Story[];
}

export default function FeaturedStories({ stories }: FeaturedStoriesProps) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          {stories.map((story) => (
            <div key={story.id} className="relative group">
              {story.featured_image_public_id ? (
                <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden bg-gray-100">
                  <CldImage
                    src={story.featured_image_public_id}
                    alt={story.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                        {story.title}
                      </h2>
                      <Link
                        href={`/stories/${story.slug}`}
                        className="inline-block px-6 py-3 bg-white text-gray-900 font-medium rounded-md hover:bg-gray-100 transition-colors"
                      >
                        See more from this story
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                  <div className="text-center p-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                      {story.title}
                    </h2>
                    <Link
                      href={`/stories/${story.slug}`}
                      className="inline-block px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
                    >
                      See more from this story
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


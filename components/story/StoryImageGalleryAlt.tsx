'use client';

import { CldImage } from 'next-cloudinary';
import type { StoryImage } from '@/types';

interface StoryImageGalleryAltProps {
  images: StoryImage[];
  storyTitle: string;
}

export default function StoryImageGalleryAlt({ images, storyTitle }: StoryImageGalleryAltProps) {
  return (
    <div className="space-y-16">
      {images.map((image) => (
        <div key={image.id} className="w-full">
          <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden bg-gray-100 mb-4">
            <CldImage
              src={image.cloudinary_public_id}
              alt={image.caption || `${storyTitle} - Image`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          {image.caption && (
            <p className="text-gray-600 text-center text-lg italic max-w-4xl mx-auto">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}


'use client';

import { CldImage } from 'next-cloudinary';
import { useState, useEffect } from 'react';
import type { Media } from '@/types';

interface MastheadCarouselProps {
  images: Media[];
}

export default function MastheadCarousel({ images }: MastheadCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <div className="w-full h-[60vh] relative">
        <CldImage
          src={images[0].cloudinary_public_id}
          alt={images[0].caption || 'Masthead image'}
          fill
          className="object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div className="w-full h-[60vh] relative overflow-hidden">
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CldImage
            src={image.cloudinary_public_id}
            alt={image.caption || `Masthead image ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}


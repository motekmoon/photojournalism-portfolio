'use client';

import { CldImage } from 'next-cloudinary';
import { useState, useEffect, useRef } from 'react';
import type { Media } from '@/types';

interface MastheadCarouselProps {
  images: Media[];
}

export default function MastheadCarousel({ images }: MastheadCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        // Scroll to the next image
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: next * scrollContainerRef.current.clientWidth,
            behavior: 'smooth',
          });
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: index * scrollContainerRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <div className="w-full aspect-[3/2] relative bg-black">
        <CldImage
          src={images[0].cloudinary_public_id}
          alt={images[0].caption || 'Masthead image'}
          fill
          className="object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-[3/2] relative overflow-hidden bg-black">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="flex-shrink-0 w-full h-full snap-start relative"
          >
            <CldImage
              src={image.cloudinary_public_id}
              alt={image.caption || `Masthead image ${index + 1}`}
              fill
              className="object-contain"
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}


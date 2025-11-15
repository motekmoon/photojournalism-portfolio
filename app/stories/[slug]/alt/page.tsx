import { notFound } from 'next/navigation';
import SiteHeader from '@/components/site/SiteHeader';
import StoryFeaturedImageAlt from '@/components/story/StoryFeaturedImageAlt';
import StoryImageGalleryAlt from '@/components/story/StoryImageGalleryAlt';
import type { Story, StoryImage } from '@/types';

async function getStoryBySlug(slug: string): Promise<{ story: Story; images: StoryImage[] } | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/public/stories/${slug}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch story');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching story:', error);
    return null;
  }
}

export default async function StoryPageAlt({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storyData = await getStoryBySlug(slug);

  if (!storyData) {
    notFound();
  }

  const { story, images } = storyData;
  
  // Separate featured image from other images
  const featuredImage = images.find(img => img.cloudinary_public_id === story.featured_image_public_id) || images[0];
  const otherImages = images.filter(img => img.id !== featuredImage?.id);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      
      {/* Full bleed featured image with overlay */}
      {featuredImage && (
        <StoryFeaturedImageAlt
          image={featuredImage}
          story={story}
        />
      )}

      {/* Additional images with captions */}
      {otherImages.length > 0 && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <StoryImageGalleryAlt images={otherImages} storyTitle={story.title} />
        </main>
      )}
    </div>
  );
}


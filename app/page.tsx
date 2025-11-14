import MastheadCarousel from '@/components/site/MastheadCarousel';
import FeaturedStories from '@/components/site/FeaturedStories';
import SiteHeader from '@/components/site/SiteHeader';
import type { Media, Story } from '@/types';

async function getMastheadImages(): Promise<Media[]> {
  try {
    // Use absolute URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/media?is_masthead=true`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.media || [];
  } catch (error) {
    console.error('Error fetching masthead images:', error);
    return [];
  }
}

async function getFeaturedStories(): Promise<Story[]> {
  try {
    // Use absolute URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stories?is_featured=true`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.stories || [];
  } catch (error) {
    console.error('Error fetching featured stories:', error);
    return [];
  }
}

export default async function Home() {
  const [mastheadImages, featuredStories] = await Promise.all([
    getMastheadImages(),
    getFeaturedStories(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <MastheadCarousel images={mastheadImages} />
        <FeaturedStories stories={featuredStories} />
      </main>
    </div>
  );
}

import SiteHeader from '@/components/site/SiteHeader';
import AboutContent from '@/components/about/AboutContent';
import type { Page } from '@/types';

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/public/pages/${slug}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch page');
    }
    
    const data = await res.json();
    return data.page;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

export default async function AboutPage() {
  const page = await getPageBySlug('about');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-4xl">
          <AboutContent 
            content={page?.content || ''} 
            profileImagePublicId={page?.profile_image_public_id || null}
          />
        </div>
      </main>
    </div>
  );
}


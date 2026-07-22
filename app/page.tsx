import type { Metadata } from 'next';
import { baseMetadata } from '@/lib/seo';
import { Hero } from '@/components/sections/Hero';
import { CategoryFilter } from '@/components/sections/CategoryFilter';
import { VideoGrid } from '@/components/sections/VideoGrid';
import { SubscribeBanner } from '@/components/sections/SubscribeBanner';
import { PlatformLinks } from '@/components/sections/PlatformLinks';
import { StatsBar } from '@/components/sections/StatsBar';

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: { canonical: 'https://trendingwires.com' },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <section id="videos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CategoryFilter />
        <VideoGrid />
      </section>
      <SubscribeBanner />
      <PlatformLinks />
    </>
  );
}

'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Play, Eye, Clock } from 'lucide-react';
import type { Video } from '@/types';
import { formatCount, timeAgo, ytEmbed, ytThumb } from '@/lib/utils';

// ─── Video modal ──────────────────────────────────────────────────────────────
function VideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div
        className="relative w-full max-w-2xl bg-tw-dark rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="aspect-[9/16] max-h-[80vh] mx-auto">
          <iframe
            src={ytEmbed(video.id)}
            title={video.title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4">
          <h2 className="font-bold text-white text-sm leading-tight">{video.title}</h2>
          <p className="text-gray-400 text-xs mt-1">{video.description}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-tw-red transition-colors"
          aria-label="Close video"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────
function VideoCard({ video, onClick }: { video: Video; onClick: () => void }) {
  return (
    <article
      className="video-card group bg-tw-card border border-tw-border rounded-2xl overflow-hidden cursor-pointer hover:border-tw-red transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(229,9,20,0.2)]"
      onClick={onClick}
      itemScope
      itemType="https://schema.org/VideoObject"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={ytThumb(video.id, 'hq')}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          itemProp="thumbnailUrl"
        />
        {/* Overlay */}
        <div className="video-overlay absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-14 h-14 bg-tw-red rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.6)]">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
        {/* Duration badge */}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-mono">
            {video.duration}
          </span>
        )}
        {/* Category badge */}
        <span className="absolute top-2 left-2 bg-tw-red text-white text-xs px-2 py-0.5 rounded-full font-bold capitalize">
          {video.category.replace('-', ' ')}
        </span>
        {/* Hidden SEO */}
        <meta itemProp="embedUrl"   content={`https://www.youtube.com/embed/${video.id}`} />
        <meta itemProp="uploadDate" content={video.publishedAt} />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 mb-2" itemProp="name">
          {video.title}
        </h3>
        <p className="text-gray-500 text-xs line-clamp-1 mb-2" itemProp="description">
          {video.description}
        </p>
        <div className="flex items-center gap-3 text-gray-500 text-xs">
          {video.viewCount && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatCount(video.viewCount)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(video.publishedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-tw-card border border-tw-border rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="aspect-video skeleton" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
      </div>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
function Grid() {
  const searchParams = useSearchParams();
  const category     = searchParams.get('category') || 'all';

  const [videos,  setVideos]  = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState<Video | null>(null);

  useEffect(() => {
    setLoading(true);
    // Use the external API Gateway directly — avoids Amplify proxy issues
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const url  = base
      ? `${base}/videos?category=${category}&limit=12`
      : `/api/videos?category=${category}&limit=12`;
    fetch(url)
      .then(r => r.json())
      .then(j => { setVideos(j.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        aria-busy="true" aria-label="Loading videos">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <>
      {videos.length === 0 ? (
        <p className="text-center text-gray-500 py-16">No videos found. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map(v => (
            <VideoCard key={v.id} video={v} onClick={() => setActive(v)} />
          ))}
        </div>
      )}
      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </>
  );
}

export function VideoGrid() {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    }>
      <Grid />
    </Suspense>
  );
}

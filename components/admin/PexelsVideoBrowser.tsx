'use client';
/**
 * PexelsVideoBrowser — shared component
 * Extracted from VideoStudio so it can be reused in QuizStudio, KidsStudio, etc.
 */
import { useState } from 'react';

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

export type PexelsVideo = {
  id: number;
  url: string;
  image: string;
  duration: number;
  video_files: { link: string; quality: string; file_type: string; width: number; height: number }[];
};

export function PexelsVideoBrowser({
  onSelect,
  defaultQuery = '',
}: {
  onSelect: (path: string, thumb: string) => void;
  defaultQuery?: string;
}) {
  const [query,       setQuery]       = useState(defaultQuery);
  const [results,     setResults]     = useState<PexelsVideo[]>([]);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [err,         setErr]         = useState('');
  const [selected,    setSelected]    = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const PER_PAGE = 9;

  const search = async (q: string, p: number) => {
    if (!q.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(
        `${PIPELINE_URL}/pipeline/search-bg-videos?q=${encodeURIComponent(q)}&page=${p}&per_page=${PER_PAGE}`
      );
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setResults(d.videos || []);
      setTotal(d.total || 0);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Search failed'); }
    setLoading(false);
  };

  const handleSearch = () => { setPage(1); search(query, 1); };
  const handlePage   = (p: number) => { setPage(p); search(query, p); };

  const handlePick = async (video: PexelsVideo) => {
    setSelected(video.id);
    setDownloading(video.id);
    try {
      const file = video.video_files.find(f => f.height >= 1080 && f.width < f.height)
        || video.video_files.find(f => f.quality === 'hd')
        || video.video_files[0];
      const r = await fetch(`${PIPELINE_URL}/pipeline/download-bg-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: file.link, id: video.id }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      onSelect(d.path, video.image);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Download failed');
      setSelected(null);
    }
    setDownloading(null);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search free videos… e.g. technology, city, nature"
          className="flex-1 border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      {/* Quick searches */}
      {!results.length && !loading && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-gray-400 self-center">Quick:</span>
          {['technology', 'abstract', 'city night', 'nature', 'space', 'quiz brain', 'colorful', 'fire'].map(t => (
            <button key={t} onClick={() => { setQuery(t); setPage(1); search(t, 1); }}
              className="text-[10px] border border-gray-200 text-gray-500 hover:border-gray-400 px-2.5 py-1 rounded-full bg-white transition-colors">
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Video grid */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {results.map(v => (
              <button
                key={v.id}
                onClick={() => handlePick(v)}
                disabled={downloading !== null}
                className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                  selected === v.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent hover:border-gray-300'
                }`}
                style={{ aspectRatio: '9/16' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.image} alt="" className="w-full h-full object-cover" />

                {/* Duration badge */}
                <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {v.duration}s
                </div>

                {/* Downloading overlay */}
                {downloading === v.id && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xs font-bold animate-pulse">⬇ Saving…</span>
                  </div>
                )}

                {/* Selected checkmark */}
                {selected === v.id && downloading !== v.id && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-3xl">✅</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-lg">Use this</span>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{total.toLocaleString()} videos found</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handlePage(page - 1)} disabled={page <= 1 || loading}
                className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold">
                ← Prev
              </button>
              <span className="text-xs text-gray-500 font-medium px-1">{page} / {totalPages}</span>
              <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages || loading}
                className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold">
                Next →
              </button>
            </div>
          </div>
          <p className="text-[9px] text-gray-300 text-center">Videos by Pexels — free for commercial use</p>
        </>
      )}
    </div>
  );
}

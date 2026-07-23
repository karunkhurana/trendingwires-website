'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── Types ────────────────────────────────────────────────────────────────────
type BgMode   = 'auto-image' | 'no-image' | 'custom-video' | 'story';
type MusicOpt = 'none' | 'upload' | string; // string = preset key
type JobResult = { youtubeUrl?: string; videoPath?: string; thumbPath?: string };
type LogLine   = { msg: string };
type Job       = { id: string; status: string; log: LogLine[]; result: JobResult | null; error: string | null };
type Script    = Record<string, unknown>;

// Preset music options — user must upload their own OR use no music
// External CDN URLs often block during Remotion server-side render
const MUSIC_PRESETS: { key: string; label: string; desc: string; url: string }[] = [];

// ─── Job poller ───────────────────────────────────────────────────────────────
function useJobPoller(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${PIPELINE_URL}/pipeline/status/${jobId}`);
        if (!r.ok || !alive) return;
        const d: Job = await r.json();
        setJob(d);
        if ((d.status === 'running' || d.status === 'pending') && alive)
          setTimeout(poll, 1200);
      } catch { if (alive) setTimeout(poll, 2500); }
    };
    poll();
    return () => { alive = false; };
  }, [jobId]);
  return job;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>{children}</div>
);

function PipelineStatus({ ok }: { ok: boolean | null }) {
  const [ytStatus, setYtStatus] = useState<'authed' | 'not-authed' | 'no-creds' | null>(null);
  const check = useCallback(() => {
    if (ok !== true) return;
    fetch(`${PIPELINE_URL}/pipeline/yt-status`)
      .then(r => r.json()).then(d => setYtStatus(d.status))
      .catch(() => setYtStatus('not-authed'));
  }, [ok]);
  useEffect(() => { check(); }, [check]);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${ok === true ? 'bg-green-500' : ok === false ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
        <span className="text-xs text-gray-500">
          Pipeline {ok === true ? <span className="text-green-600 font-medium">online</span> : ok === false ? <span className="text-red-500 font-medium">offline — run: <code className="font-mono bg-red-50 px-1 rounded">npm run pipeline</code></span> : 'checking…'}
        </span>
      </div>
      {ytStatus === 'authed' && <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-medium">✅ YouTube connected</span>}
      {ytStatus === 'not-authed' && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">⚠️ YouTube not connected — run <code className="font-mono bg-amber-100 px-1 rounded">npm run auth:youtube</code></span>}
    </div>
  );
}

// ─── Pexels Video Browser ─────────────────────────────────────────────────────
type PexelsVideo = {
  id: number;
  url: string;
  image: string; // thumbnail
  duration: number;
  video_files: { link: string; quality: string; file_type: string; width: number; height: number }[];
};

function PexelsVideoBrowser({ onSelect }: { onSelect: (path: string, thumb: string) => void }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<PexelsVideo[]>([]);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');
  const [selected, setSelected] = useState<number | null>(null);
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
  const handlePage = (p: number) => { setPage(p); search(query, p); };

  const handlePick = async (video: PexelsVideo) => {
    setSelected(video.id);
    setDownloading(video.id);
    try {
      // Pick best portrait/HD file
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
          className="flex-1 border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 placeholder:text-gray-300"
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
          {['technology','abstract','city night','nature','space','AI robot','business','fire'].map(t => (
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
                  selected === v.id ? 'border-red-500 ring-2 ring-red-200' : 'border-transparent hover:border-gray-300'
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
                    <span className="text-white text-xs font-bold animate-pulse">⬇ Downloading…</span>
                  </div>
                )}
                {/* Selected checkmark */}
                {selected === v.id && downloading !== v.id && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
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

// ─── Pixabay Music Browser ────────────────────────────────────────────────────
type PixabayTrack = {
  id: number;
  title: string;
  duration: number;
  previewUrl: string;
  tags: string;
};

function MusicBrowser({ onSelect }: { onSelect: (localPath: string, title: string) => void }) {
  const [query,      setQuery]      = useState('news');
  const [tracks,     setTracks]     = useState<PixabayTrack[]>([]);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState('');
  const [playing,    setPlaying]    = useState<number | null>(null);
  const [audio,      setAudio]      = useState<HTMLAudioElement | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const PER_PAGE = 8;

  const search = async (q: string, p: number) => {
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/search-bgm?q=${encodeURIComponent(q)}&page=${p}&per_page=${PER_PAGE}`);
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setTracks(d.tracks || []);
      setTotal(d.total || 0);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Search failed'); }
    setLoading(false);
  };

  useEffect(() => { search(query, 1); }, []); // eslint-disable-line

  const handleSearch = () => { setPage(1); search(query, 1); };
  const handlePage   = (p: number) => { setPage(p); search(query, p); };

  const togglePlay = (track: PixabayTrack) => {
    if (audio) { audio.pause(); setAudio(null); }
    if (playing === track.id) { setPlaying(null); return; }
    const a = new Audio(track.previewUrl);
    a.volume = 0.5;
    a.play().catch(() => {});
    a.onended = () => setPlaying(null);
    setAudio(a);
    setPlaying(track.id);
  };

  const handlePick = async (track: PixabayTrack) => {
    setDownloading(track.id);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/download-bgm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: track.previewUrl, id: track.id, title: track.title }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      onSelect(d.path, track.title);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Download failed'); }
    setDownloading(null);
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const fmtDur = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search music… e.g. news, upbeat, corporate, sport"
          className="flex-1 border border-gray-200 bg-gray-50 text-gray-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 placeholder:text-gray-300" />
        <button onClick={handleSearch} disabled={loading}
          className="bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5">
        {['news','upbeat','corporate','sport','cinematic','lofi','dramatic','ambient'].map(t => (
          <button key={t} onClick={() => { setQuery(t); setPage(1); search(t, 1); }}
            className="text-[10px] border border-gray-200 text-gray-500 hover:border-gray-400 px-2.5 py-1 rounded-full bg-white transition-colors">
            {t}
          </button>
        ))}
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      {/* Track list */}
      {tracks.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5">
            {tracks.map(track => (
              <div key={track.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 hover:border-gray-300 transition-colors">
                {/* Play button */}
                <button onClick={() => togglePlay(track)}
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm transition-colors ${playing === track.id ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                  {playing === track.id ? '⏹' : '▶'}
                </button>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{track.title}</p>
                  <p className="text-[10px] text-gray-400">{fmtDur(track.duration)} · {track.tags.split(',').slice(0,3).join(', ')}</p>
                </div>
                {/* Use button */}
                <button onClick={() => handlePick(track)} disabled={downloading !== null}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors flex-shrink-0 flex items-center gap-1">
                  {downloading === track.id ? '⬇' : '✓'} {downloading === track.id ? 'Saving…' : 'Use'}
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{total.toLocaleString()} tracks</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handlePage(page-1)} disabled={page<=1||loading}
                className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold">← Prev</button>
              <span className="text-xs text-gray-500 px-1">{page}/{totalPages}</span>
              <button onClick={() => handlePage(page+1)} disabled={page>=totalPages||loading}
                className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold">Next →</button>
            </div>
          </div>
          <p className="text-[9px] text-gray-300 text-center">Music by Pixabay — free for commercial use</p>
        </>
      )}
    </div>
  );
}

// ─── Music Picker ─────────────────────────────────────────────────────────────
function MusicPicker({
  value, onChange,
}: {
  value: MusicOpt;
  onChange: (v: MusicOpt) => void;
}) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [uploading,    setUploading]    = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [showBrowser,  setShowBrowser]  = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('music', file);
      const r = await fetch(`${PIPELINE_URL}/pipeline/upload-bgm`, { method: 'POST', body: form });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setSelectedTitle(file.name);
      onChange(d.url);
      setShowBrowser(false);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Upload failed'); }
    setUploading(false);
  };

  const handleBrowserSelect = (path: string, title: string) => {
    onChange(path);
    setSelectedTitle(title);
    setShowBrowser(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Background Music</label>

      {/* Current selection */}
      {value && value !== 'none' ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <span className="text-green-600 text-sm">🎵</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-700 truncate">{selectedTitle || value.split('/').pop()}</p>
            <p className="text-[10px] text-green-500">Will play at low volume in background</p>
          </div>
          <button onClick={() => { onChange('none'); setSelectedTitle(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg bg-white flex-shrink-0">
            Remove
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-400 text-center">
          No music selected — video will be silent
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => setShowBrowser(!showBrowser)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${showBrowser ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
          🔍 Browse Pixabay Music
        </button>
        <label className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors text-center cursor-pointer disabled:opacity-50">
          {uploading ? '⏳ Uploading…' : '📁 Upload MP3'}
          <input ref={fileRef} type="file" accept="audio/mp3,audio/mpeg,audio/wav,audio/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>
      </div>

      {showBrowser && (
        <div className="border border-gray-200 rounded-xl p-3 bg-white">
          <MusicBrowser onSelect={handleBrowserSelect} />
        </div>
      )}
    </div>
  );
}

// ─── Background Mode Selector ─────────────────────────────────────────────────
const BG_MODES: { id: BgMode; icon: string; label: string; desc: string }[] = [
  { id: 'auto-image',   icon: '🖼️', label: 'Auto Images',    desc: 'AI fetches relevant Pexels photos' },
  { id: 'no-image',     icon: '⬛', label: 'Text Only',       desc: 'Black bg, star animation, no image — original style' },
  { id: 'story',        icon: '🎭', label: 'Story Style',     desc: 'Cream bg, animated character, counter — viral facts style' },
  { id: 'custom-video', icon: '🎬', label: 'Pick Video',      desc: 'Browse free Pexels videos or upload your own' },
];

function BgModeSelector({
  value, onChange, customVideoUrl, onCustomVideoChange,
}: {
  value: BgMode;
  onChange: (m: BgMode) => void;
  customVideoUrl: string;
  onCustomVideoChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [thumbUrl,  setThumbUrl]  = useState('');
  const [showBrowser, setShowBrowser] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true); setUploadErr('');
    try {
      const form = new FormData();
      form.append('video', file);
      const r = await fetch(`${PIPELINE_URL}/pipeline/upload-bg-video`, { method: 'POST', body: form });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      onCustomVideoChange(d.path);
      setThumbUrl('');
    } catch (e: unknown) { setUploadErr(e instanceof Error ? e.message : 'Upload failed'); }
    setUploading(false);
  };

  const handleBrowserSelect = (path: string, thumb: string) => {
    onCustomVideoChange(path);
    setThumbUrl(thumb);
    setShowBrowser(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Background Style</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BG_MODES.map(m => (
          <button key={m.id} onClick={() => { onChange(m.id); if (m.id === 'custom-video') setShowBrowser(true); }}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${value === m.id ? 'border-red-400 bg-red-50 ring-2 ring-red-200' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <span className="text-xl">{m.icon}</span>
            <span className={`text-xs font-bold ${value === m.id ? 'text-red-700' : 'text-gray-700'}`}>{m.label}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Custom video panel */}
      {value === 'custom-video' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <input ref={fileRef} type="file" accept="video/mp4,video/mov,video/quicktime,video/*"
            className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {/* Currently selected video */}
          {customVideoUrl && (
            <div className="flex items-center gap-3 bg-white border border-green-200 rounded-xl px-3 py-2">
              {thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt="" className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-700 truncate">✅ {customVideoUrl.split('/').pop()}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Will loop in background</p>
              </div>
              <button onClick={() => { onCustomVideoChange(''); setThumbUrl(''); setShowBrowser(true); }}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg bg-white flex-shrink-0">
                Change
              </button>
            </div>
          )}

          {/* Toggle between browser and upload */}
          {(!customVideoUrl || showBrowser) && (
            <>
              <div className="flex gap-2">
                <button onClick={() => setShowBrowser(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${showBrowser ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  🔍 Browse Free Videos
                </button>
                <button onClick={() => { setShowBrowser(false); fileRef.current?.click(); }}
                  disabled={uploading}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50">
                  {uploading ? '⏳ Uploading…' : '📁 Upload My Video'}
                </button>
              </div>

              {showBrowser && (
                <div className="border border-gray-200 rounded-xl p-3 bg-white">
                  <PexelsVideoBrowser onSelect={handleBrowserSelect} />
                </div>
              )}
            </>
          )}

          {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Script preview card ──────────────────────────────────────────────────────
function ScriptPreview({
  script, onEdit, onRun, running, bgMode, onBgModeChange, customVideoUrl, onCustomVideoChange, musicUrl, onMusicChange, onScriptChange,
}: {
  script: Script;
  onEdit: () => void;
  onRun: (uploadToYT: boolean) => void;
  running: boolean;
  bgMode: BgMode;
  onBgModeChange: (m: BgMode) => void;
  customVideoUrl: string;
  onCustomVideoChange: (url: string) => void;
  musicUrl: MusicOpt;
  onMusicChange: (v: MusicOpt) => void;
  onScriptChange: (s: Script) => void;
}) {
  const [uploadToYT, setUploadToYT] = useState(false);
  const [generatingImg, setGeneratingImg] = useState<number | null>(null);

  const field = (label: string, value: string | undefined | null, mono = false): JSX.Element | null => value ? (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">{label}</span>
      <span className={`text-sm text-gray-800 leading-relaxed whitespace-pre-line ${mono ? 'font-mono text-xs' : ''}`}>{String(value)}</span>
    </div>
  ) : null;

  // Get scenes for image panel
  const scenes = (script.scenes as Array<{headline:string;subText?:string;imageQuery?:string;imageUrl?:string}> | undefined) || [];
  const hasScenes = scenes.length > 0;
  // Show image panel for auto-image and story modes
  // If no scenes array, show single image slot using script.imageUrl
  const showImagePanel = bgMode === 'auto-image' || bgMode === 'story';
  const displayScenes = hasScenes ? scenes : (script.hookLine ? [
    { headline: String(script.hookLine), subText: String(script.hookSub || ''), imageQuery: String(script.slug || '').replace(/-/g,' '), imageUrl: script.imageUrl as string | undefined },
  ] : []);

  const generateImage = async (sceneIdx: number, query: string) => {
    setGeneratingImg(sceneIdx);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sceneIdx, slug: String(script.slug) }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      if (hasScenes) {
        const updatedScenes = [...scenes];
        updatedScenes[sceneIdx] = { ...updatedScenes[sceneIdx], imageUrl: d.url };
        onScriptChange({ ...script, scenes: updatedScenes });
      } else {
        onScriptChange({ ...script, imageUrl: d.url });
      }
    } catch (e: unknown) {
      alert('Image generation failed: ' + (e instanceof Error ? e.message : 'unknown'));
    }
    setGeneratingImg(null);
  };

  const uploadSceneImage = async (sceneIdx: number, file: File) => {
    const form = new FormData();
    form.append('image', file);
    form.append('sceneIdx', String(sceneIdx));
    form.append('slug', String(script.slug));
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/upload-scene-image`, { method: 'POST', body: form });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      if (hasScenes) {
        const updatedScenes = [...scenes];
        updatedScenes[sceneIdx] = { ...updatedScenes[sceneIdx], imageUrl: d.url };
        onScriptChange({ ...script, scenes: updatedScenes });
      } else {
        onScriptChange({ ...script, imageUrl: d.url });
      }
    } catch (e: unknown) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : 'unknown'));
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">✅</span>
          <span className="font-bold text-gray-800 text-sm">Script Ready</span>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{String(script.category || 'AI & TECH')}</span>
        </div>
        <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg bg-white">✏ Edit topic</button>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {field('Hook', script.hookLine as string)}
          {field('Hook subtitle', script.hookSub as string)}
          {field('Fact', script.factLine as string)}
          {field('Accent color', String(script.accentColor || '#E50914'))}
        </div>
        <div className="flex flex-col gap-3">
          {field('YouTube title', script.title as string)}
          {field('Voice – Hook', script.voiceHook as string)}
          {field('Voice – Fact', script.voiceFact as string)}
          {field('Hashtags', script.hashtags as string)}
          {!!script.imageUrl && bgMode === 'auto-image' && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Preview Image</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={String(script.imageUrl)}
                alt="video bg"
                className="w-full h-28 object-cover rounded-xl border border-gray-100"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Description preview */}
      {!!script.description && (
        <div className="px-5 pb-4">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Description</span>
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-500 font-mono whitespace-pre-line max-h-32 overflow-y-auto">
            {String(script.description)}
          </div>
        </div>
      )}

      {/* ── Scene Images Panel ── */}
      {showImagePanel && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scene Images</span>
            <span className="text-[10px] text-gray-400">AI uses these as backgrounds · ~$0.04 per AI generation</span>
          </div>
          <div className="flex flex-col gap-3">
            {displayScenes.map((scene, i) => {
              const fileRef = { current: null as HTMLInputElement | null };
              return (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 border border-gray-100">
                    {scene.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={scene.imageUrl.startsWith('http') ? scene.imageUrl : `${PIPELINE_URL}/static/${scene.imageUrl}`}
                        alt="" className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {i === scenes.length - 1 ? '📡' : '🖼️'}
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Scene {i+1}</span>
                      <p className="text-xs font-bold text-gray-800 truncate">{scene.headline?.replace(/\\n/g,' ')}</p>
                      {scene.imageQuery && (
                        <p className="text-[10px] text-blue-500 mt-0.5 truncate">🔍 "{scene.imageQuery}"</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {/* Generate with AI */}
                      <button
                        onClick={() => generateImage(i, scene.imageQuery || scene.headline || 'trending news')}
                        disabled={generatingImg !== null}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {generatingImg === i ? '⏳' : '✨'} {generatingImg === i ? 'Generating…' : 'AI Generate ($0.04)'}
                      </button>
                      {/* Upload own */}
                      <label className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-800 text-white cursor-pointer transition-colors flex items-center gap-1">
                        📁 Upload
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && uploadSceneImage(i, e.target.files[0])} />
                      </label>
                      {/* Clear */}
                      {scene.imageUrl && (
                        <button
                          onClick={() => {
                            if (hasScenes) {
                              const updated = [...scenes];
                              updated[i] = { ...updated[i], imageUrl: undefined };
                              onScriptChange({ ...script, scenes: updated });
                            } else {
                              onScriptChange({ ...script, imageUrl: undefined });
                            }
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                        >✕ Clear</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">If you don&apos;t upload, Pexels auto-search is used. Upload your own for exact matches.</p>
        </div>
      )}

      {/* ── Background mode selector ── */}
      <div className="px-5 pb-4 border-t border-gray-100 pt-4 flex flex-col gap-4">
        <BgModeSelector
          value={bgMode}
          onChange={onBgModeChange}
          customVideoUrl={customVideoUrl}
          onCustomVideoChange={onCustomVideoChange}
        />
        <MusicPicker value={musicUrl} onChange={onMusicChange} />
      </div>

      {/* Publish controls */}
      <div className="px-5 pb-5 flex flex-col gap-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${uploadToYT ? 'bg-red-500' : 'bg-gray-200'}`}
            onClick={() => setUploadToYT(!uploadToYT)}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${uploadToYT ? 'left-4' : 'left-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600">Upload to YouTube after render</span>
        </label>

        <button
          onClick={() => onRun(uploadToYT)}
          disabled={running || (bgMode === 'custom-video' && !customVideoUrl)}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-red-100 flex items-center justify-center gap-2"
        >
          {running
            ? <><span className="animate-spin">⚙️</span> Running pipeline…</>
            : bgMode === 'custom-video' && !customVideoUrl
            ? <><span>📁</span> Upload a background video first</>
            : <><span>🚀</span> {uploadToYT ? 'Render & Publish to YouTube' : 'Render Video'}</>
          }
        </button>
        {bgMode === 'custom-video' && !customVideoUrl && (
          <p className="text-xs text-center text-amber-500">↑ Upload your background MP4/MOV to continue</p>
        )}
      </div>
    </Card>
  );
}

// ─── Job progress (unchanged) ─────────────────────────────────────────────────
function JobProgress({ job, slug }: { job: Job; slug: string }) {
  const isDone   = job.status === 'done';
  const isFailed = job.status === 'error';
  const [uploading, setUploading] = useState(false);
  const [uploadJobId, setUploadJobId] = useState<string|null>(null);
  const uploadJob = useJobPoller(uploadJobId);

  const logText = job.log.map(l => l.msg).join('\n');
  const steps = [
    { key: '🎙️ Generating voiceover', done: logText.includes('Voiceover done') },
    { key: '🎬 Rendering video',       done: logText.includes('Video rendered') || logText.includes('Video:') },
    { key: '🖼️ Generating thumbnail',  done: logText.includes('Thumbnail ready') },
    { key: '📤 Uploading to YouTube',  done: !!(job.result?.youtubeUrl) },
  ];

  const uploadNow = async () => {
    setUploading(true);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/upload`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const d = await r.json();
      if (d.jobId) setUploadJobId(d.jobId);
      else alert(d.error || 'Upload failed');
    } catch { alert('Pipeline server offline'); }
    setUploading(false);
  };

  const youtubeUrl = job.result?.youtubeUrl || uploadJob?.result?.youtubeUrl;
  const isUploading = uploadJob?.status === 'running' || uploadJob?.status === 'pending';

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="font-bold text-gray-800 text-sm">Pipeline Progress</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${isDone ? 'bg-green-50 text-green-600 border-green-200' : isFailed ? 'bg-red-50 text-red-500 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'}`}>{job.status.toUpperCase()}</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 gap-2">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs ${s.done ? 'text-green-600' : 'text-gray-400'}`}>
            <span>{s.done ? '✅' : '○'}</span>
            <span className={s.done ? 'font-medium' : ''}>{s.key}</span>
          </div>
        ))}
      </div>
      <div className="px-5 pb-4">
        <div className="bg-gray-900 rounded-xl p-3 max-h-40 overflow-y-auto flex flex-col gap-0.5">
          {job.log.map((l, i) => (
            <div key={i} className={`text-xs font-mono ${l.msg.startsWith('✓') || l.msg.startsWith('🎉') ? 'text-green-400' : l.msg.startsWith('❌') ? 'text-red-400' : l.msg.startsWith('⏭') ? 'text-gray-500' : 'text-gray-300'}`}>{l.msg}</div>
          ))}
          {uploadJob?.log.map((l, i) => (
            <div key={`u${i}`} className={`text-xs font-mono ${l.msg.startsWith('✓') ? 'text-green-400' : l.msg.startsWith('❌') ? 'text-red-400' : 'text-blue-300'}`}>{l.msg}</div>
          ))}
          {!isDone && !isFailed && <div className="text-amber-400 text-xs font-mono animate-pulse">● processing…</div>}
          {isUploading && <div className="text-blue-400 text-xs font-mono animate-pulse">● uploading to YouTube…</div>}
        </div>
      </div>
      {isFailed && <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">❌ {job.error}</div>}
      {isDone && job.result && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="relative mx-auto rounded-2xl overflow-hidden bg-black border border-gray-200 shadow-lg" style={{ width: 160, aspectRatio: '9/16' }}>
            <video src={`${PIPELINE_URL}/pipeline/preview/${slug}`} controls className="w-full h-full object-cover" preload="metadata" />
          </div>
          <div className="flex flex-col gap-2">
            <a href={`${PIPELINE_URL}/pipeline/preview/${slug}`} download={`${slug}.mp4`} className="w-full border border-gray-200 text-gray-600 hover:text-gray-800 text-sm font-bold py-3 px-4 rounded-xl text-center transition-colors bg-white hover:bg-gray-50">⬇ Download MP4</a>
            {!youtubeUrl && (
              <button onClick={uploadNow} disabled={uploading || isUploading} className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-red-100 flex items-center justify-center gap-2">
                {isUploading || uploading ? <><span className="animate-spin text-base">⚙️</span> Uploading…</> : <><svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0"><path d="M23.5 6.2s-.2-1.6-.9-2.3c-.9-.9-1.8-.9-2.3-1C17.6 2.7 12 2.7 12 2.7s-5.6 0-8.3.2c-.5.1-1.5.1-2.3 1-.7.7-.9 2.3-.9 2.3S.3 8 .3 9.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.7.2 7.7.2s5.6 0 8.3-.2c.5-.1 1.5-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.7 15.5V8.1l6.6 3.7-6.6 3.7z"/></svg>Publish to YouTube</>}
              </button>
            )}
            {youtubeUrl && (
              <div className="flex flex-col gap-2">
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-3 px-4 rounded-xl text-center transition-colors">▶ View on YouTube</a>
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs font-bold hover:underline break-all">{youtubeUrl}</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Studio ──────────────────────────────────────────────────────────────
export function VideoStudio() {
  const [topic,            setTopic]            = useState('');
  const [instructions,     setInstructions]     = useState('');
  const [researching,      setResearching]      = useState(false);
  const [script,           setScript]           = useState<Script | null>(null);
  const [researchErr,      setResearchErr]      = useState('');
  const [jobId,            setJobId]            = useState<string | null>(null);
  const [running,          setRunning]          = useState(false);
  const [pipelineOk,       setPipelineOk]       = useState<boolean | null>(null);
  const [bgMode,           setBgMode]           = useState<BgMode>('auto-image');
  const [customVideoUrl,   setCustomVideoUrl]   = useState('');
  const [musicUrl,         setMusicUrl]         = useState<MusicOpt>('none');

  const job  = useJobPoller(jobId);
  const slug = String(script?.slug || '');

  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`).then(r => setPipelineOk(r.ok)).catch(() => setPipelineOk(false));
  }, []);

  const research = async () => {
    if (!topic.trim()) return;
    setResearching(true);
    setResearchErr('');
    setScript(null);
    setJobId(null);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, instructions }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Research failed'); }
      const d = await r.json();
      setScript(d.script);
    } catch (e: unknown) {
      setResearchErr(e instanceof Error ? e.message : 'Failed. Is the pipeline server running?');
    }
    setResearching(false);
  };

  const run = async (uploadToYT: boolean) => {
    if (!script) return;
    setRunning(true);
    setJobId(null);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...script,
          _bgMode: bgMode,
          _customVideoUrl: customVideoUrl,
          _musicUrl: musicUrl === 'none' ? '' : musicUrl,
          _noUpload: !uploadToYT,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.jobId);
    } catch (e: unknown) {
      alert(`Pipeline error: ${e instanceof Error ? e.message : 'unknown'}\n\nMake sure: npm run pipeline is running.`);
    }
    setRunning(false);
  };

  const isRunning = job?.status === 'running' || job?.status === 'pending';

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
        <PipelineStatus ok={pipelineOk} />
      </div>

      {/* ── Topic input ── */}
      <Card>
        <div className="px-5 pt-5 pb-2">
          <h2 className="font-black text-gray-900 text-base mb-0.5">What&apos;s your video about?</h2>
          <p className="text-gray-400 text-xs">Enter a topic and optional instructions. AI fills everything else.</p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && research()}
              placeholder="e.g. Claude 4 beats GPT-4o on every benchmark"
              className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Instructions <span className="text-gray-300 font-normal normal-case tracking-normal">optional</span>
            </label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
              placeholder="e.g. Make it punchy. Use blue accent. Include the 99.7% accuracy stat."
              className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all placeholder:text-gray-300 resize-none" />
          </div>
          {researchErr && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">{researchErr}</div>}
          <button onClick={research} disabled={!topic.trim() || researching || pipelineOk !== true}
            className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {researching ? <><span className="animate-spin text-base">✨</span> AI is filling the script…</> : <><span>✨</span> Generate Script with AI</>}
          </button>
          <div>
            <p className="text-xs text-gray-400 mb-2">Try these:</p>
            <div className="flex flex-wrap gap-2">
              {['OpenAI just released o3 — what developers need to know','India becomes 3rd largest economy','This AI replaces 50% of coding jobs','NASA confirmed water on Mars'].map(ex => (
                <button key={ex} onClick={() => setTopic(ex)} className="text-xs border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 px-3 py-1.5 rounded-full bg-white transition-colors">{ex}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Script preview ── */}
      {script && !isRunning && !jobId && (
        <ScriptPreview
          script={script}
          onEdit={() => { setScript(null); setJobId(null); }}
          onRun={run}
          running={running}
          bgMode={bgMode}
          onBgModeChange={setBgMode}
          customVideoUrl={customVideoUrl}
          onCustomVideoChange={setCustomVideoUrl}
          musicUrl={musicUrl}
          onMusicChange={setMusicUrl}
          onScriptChange={setScript}
        />
      )}

      {/* ── Job progress ── */}
      {jobId && job && <JobProgress job={job} slug={slug} />}
    </div>
  );
}

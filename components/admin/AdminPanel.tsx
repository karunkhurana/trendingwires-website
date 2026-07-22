'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Video, Category } from '@/types';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ai-tech',    label: '🤖 AI & Tech' },
  { id: 'business',   label: '💼 Business' },
  { id: 'world',      label: '🌍 World' },
  { id: 'science',    label: '🔬 Science' },
  { id: 'social',     label: '📱 Social Media' },
  { id: 'innovation', label: '🚀 Innovation' },
];

// ─── Extract YouTube ID from URL or raw ID ────────────────────────────────────
function extractYtId(input: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return '';
}

// ─── Fetch YouTube title/description via oEmbed (no API key needed) ──────────
async function fetchYtMeta(videoId: string) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return { title: d.title as string };
  } catch { return null; }
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw,  setPw]  = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    const res  = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) { onLogin(); }
    else { setErr('Wrong password'); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-tw-black flex items-center justify-center px-4">
      <div className="bg-tw-card border border-tw-border rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-black text-white mb-1">
          TRENDING<span className="text-tw-red"> WIRES</span>
        </h1>
        <p className="text-gray-500 text-sm mb-6">Admin Panel</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Admin password"
            className="bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red"
            autoFocus
          />
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-tw-red hover:bg-tw-redHover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Add video form ────────────────────────────────────────────────────────────
function AddVideoForm({ onAdded }: { onAdded: () => void }) {
  const [ytInput,   setYtInput]   = useState('');
  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [category,  setCategory]  = useState<Category>('ai-tech');
  const [duration,  setDuration]  = useState('');
  const [viewCount, setViewCount] = useState('');
  const [preview,   setPreview]   = useState('');
  const [fetching,  setFetching]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');

  // Auto-fetch metadata when YouTube URL/ID is pasted
  const handleYtInput = async (val: string) => {
    setYtInput(val);
    const id = extractYtId(val.trim());
    if (id.length === 11) {
      setPreview(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
      setFetching(true);
      const meta = await fetchYtMeta(id);
      if (meta) setTitle(meta.title);
      setFetching(false);
    } else {
      setPreview('');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYtId(ytInput.trim());
    if (!id) { setMsg('❌ Invalid YouTube URL or ID'); return; }
    if (!title.trim()) { setMsg('❌ Title is required'); return; }

    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/videos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, description: desc, category, duration, viewCount }),
    });
    if (res.ok) {
      setMsg('✅ Video published!');
      setYtInput(''); setTitle(''); setDesc(''); setDuration(''); setViewCount(''); setPreview('');
      onAdded();
    } else {
      const d = await res.json();
      setMsg(`❌ ${d.error || 'Failed'}`);
    }
    setSaving(false);
  };

  return (
    <div className="bg-tw-card border border-tw-border rounded-2xl p-6">
      <h2 className="text-lg font-black text-white mb-5">➕ Publish New Video</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">

        {/* YouTube URL */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">YouTube URL or Video ID</label>
          <input
            value={ytInput}
            onChange={e => handleYtInput(e.target.value)}
            placeholder="https://youtu.be/VIDEO_ID  or  VIDEO_ID"
            className="w-full bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red text-sm"
          />
        </div>

        {/* Thumbnail preview */}
        {preview && (
          <div className="flex gap-4 items-start bg-[#111] rounded-xl p-3 border border-tw-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="thumbnail" className="w-32 rounded-lg flex-shrink-0" />
            <div className="text-xs text-gray-400">
              {fetching ? <span className="animate-pulse text-yellow-400">Fetching title…</span>
                : <span className="text-green-400">✓ Thumbnail ready</span>}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Video title"
            required
            className="w-full bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Description</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Short description (1-2 sentences)"
            rows={2}
            className="w-full bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red text-sm resize-none"
          />
        </div>

        {/* Row: category + duration + views */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className="w-full bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red text-sm"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Duration</label>
            <input
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="0:58"
              className="w-full bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">View Count</label>
            <input
              type="number"
              value={viewCount}
              onChange={e => setViewCount(e.target.value)}
              placeholder="142000"
              className="w-full bg-[#111] border border-tw-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-tw-red text-sm"
            />
          </div>
        </div>

        {msg && <p className={`text-sm ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-tw-red hover:bg-tw-redHover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-1"
        >
          {saving ? 'Publishing…' : '🚀 Publish Video'}
        </button>
      </form>
    </div>
  );
}

// ─── Video list ────────────────────────────────────────────────────────────────
function VideoList({ videos, onDelete }: { videos: Video[]; onDelete: (v: Video) => void }) {
  if (!videos.length) {
    return (
      <div className="bg-tw-card border border-tw-border rounded-2xl p-8 text-center text-gray-500">
        No videos published yet. Add your first one above!
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {videos.map(v => (
        <div key={v.id + v.publishedAt}
          className="bg-tw-card border border-tw-border rounded-2xl p-4 flex gap-4 items-center hover:border-gray-600 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.thumbnail} alt={v.title} className="w-24 h-14 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{v.title}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="bg-tw-red/20 text-tw-red text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                {v.category}
              </span>
              {v.duration && (
                <span className="bg-[#111] text-gray-400 text-xs px-2 py-0.5 rounded-full">
                  ⏱ {v.duration}
                </span>
              )}
              <span className="text-gray-600 text-xs self-center">
                {new Date(v.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a
              href={`https://youtu.be/${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white text-xs border border-tw-border px-3 py-2 rounded-lg transition-colors"
            >
              Watch ↗
            </a>
            <button
              onClick={() => onDelete(v)}
              className="text-red-500 hover:text-white hover:bg-red-600 text-xs border border-red-800 px-3 py-2 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────
export function AdminPanel() {
  const [authed,  setAuthed]  = useState(false);
  const [checked, setChecked] = useState(false);
  const [videos,  setVideos]  = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Check if already logged in via cookie
  useEffect(() => {
    fetch('/api/admin/videos')
      .then(r => { if (r.ok) setAuthed(true); })
      .finally(() => setChecked(true));
  }, []);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/videos');
    if (r.ok) {
      const d = await r.json();
      setVideos(d.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) loadVideos(); }, [authed, loadVideos]);

  const handleDelete = async (v: Video) => {
    if (!confirm(`Delete "${v.title}"?`)) return;
    setDeleting(v.id);
    await fetch('/api/admin/videos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, publishedAt: v.publishedAt }),
    });
    setVideos(prev => prev.filter(x => x.id !== v.id));
    setDeleting(null);
  };

  if (!checked) return null;
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-tw-black">
      {/* Header */}
      <div className="bg-tw-dark border-b border-tw-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-black text-white">
            TRENDING<span className="text-tw-red"> WIRES</span>
            <span className="text-gray-500 font-normal text-sm ml-2">Admin</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-xs font-medium">● Live</span>
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-xs border border-tw-border px-3 py-1.5 rounded-lg transition-colors">
              View Site ↗
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Published', value: videos.length },
            { label: 'Categories', value: new Set(videos.map(v => v.category)).size },
            { label: 'Latest', value: videos[0] ? new Date(videos[0].publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—' },
          ].map(s => (
            <div key={s.label} className="bg-tw-card border border-tw-border rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-tw-red">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        <AddVideoForm onAdded={loadVideos} />

        {/* Video list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">
              📋 Published Videos
              <span className="text-gray-500 font-normal text-sm ml-2">({videos.length})</span>
            </h2>
            <button
              onClick={loadVideos}
              disabled={loading}
              className="text-gray-400 hover:text-white text-xs border border-tw-border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="bg-tw-card border border-tw-border rounded-2xl h-20 skeleton" />)}
            </div>
          ) : (
            <VideoList videos={videos} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}

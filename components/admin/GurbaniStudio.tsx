'use client';
/**
 * GurbaniStudio.tsx
 * Create videos from Guru Granth Sahib verses with audio trimming.
 *
 * Flow:
 * 1. Search/pick a verse (Ang number or keyword search via GurbaniNow API)
 * 2. Upload Gurbani audio (from SikhNet or your own recording)
 * 3. Trim audio — select start/end time with a slider
 * 4. AI generates Hindi/English meaning narration
 * 5. Render beautiful saffron/gold themed video
 * 6. Upload to YouTube
 */

import { useState, useEffect, useRef } from 'react';

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── Types ────────────────────────────────────────────────────────────────────
type GurbaniLine = {
  gurmukhi: string;
  english: string;
  punjabi: string;
  pageNo: number;
  lineNo: number;
  shabadId: string;
};

type GurbaniVerse = {
  lines: GurbaniLine[];
  pageNo: number;
  source: string;
  writer: string;
  raag: string;
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>{children}</div>
);

// ─── Audio Trimmer Component ──────────────────────────────────────────────────
function AudioTrimmer({
  audioUrl,
  onTrimChange,
}: {
  audioUrl: string;
  onTrimChange: (start: number, end: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart]       = useState(0);
  const [end, setEnd]           = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      setDuration(audio.duration);
      setEnd(audio.duration);
      onTrimChange(0, audio.duration);
    };
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      // Stop at end trim point
      if (audio.currentTime >= end) {
        audio.pause();
        setPlaying(false);
      }
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
    };
  }, [audioUrl, end]);

  const playPreview = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    audio.currentTime = start;
    audio.play();
    setPlaying(true);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStartChange = (v: number) => {
    const newStart = Math.min(v, end - 0.5);
    setStart(newStart);
    onTrimChange(newStart, end);
  };

  const handleEndChange = (v: number) => {
    const newEnd = Math.max(v, start + 0.5);
    setEnd(newEnd);
    onTrimChange(start, newEnd);
  };

  const trimDuration = end - start;

  return (
    <div className="flex flex-col gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-amber-800 uppercase tracking-wider">✂️ Trim Audio</span>
        <span className="text-xs text-amber-600 font-bold">
          Selected: {formatTime(start)} → {formatTime(end)} ({trimDuration.toFixed(1)}s)
        </span>
      </div>

      {/* Visual timeline bar */}
      <div className="relative h-8 bg-amber-100 rounded-xl overflow-hidden border border-amber-200">
        {/* Full track */}
        <div className="absolute inset-0" />
        {/* Selected region */}
        <div
          className="absolute top-0 bottom-0 bg-amber-400/40 border-l-2 border-r-2 border-amber-600"
          style={{ left: `${(start / duration) * 100}%`, width: `${((end - start) / duration) * 100}%` }}
        />
        {/* Playhead */}
        {playing && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}
      </div>

      {/* Start slider */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-amber-700 w-10">Start</span>
        <input type="range" min={0} max={duration} step={0.1} value={start}
          onChange={e => handleStartChange(parseFloat(e.target.value))}
          className="flex-1 accent-amber-600" />
        <span className="text-xs text-amber-800 font-mono w-12 text-right">{formatTime(start)}</span>
      </div>

      {/* End slider */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-amber-700 w-10">End</span>
        <input type="range" min={0} max={duration} step={0.1} value={end}
          onChange={e => handleEndChange(parseFloat(e.target.value))}
          className="flex-1 accent-amber-600" />
        <span className="text-xs text-amber-800 font-mono w-12 text-right">{formatTime(end)}</span>
      </div>

      {/* Play preview button */}
      <button onClick={playPreview}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
          playing ? 'bg-red-500 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}>
        {playing ? '⏹ Stop Preview' : '▶ Play Selected Portion'}
      </button>

      {duration > 0 && (
        <p className="text-[10px] text-amber-600 text-center">
          Full audio: {formatTime(duration)} · Selected: {trimDuration.toFixed(1)}s
        </p>
      )}
    </div>
  );
}


// ─── Main GurbaniStudio ───────────────────────────────────────────────────────
export function GurbaniStudio() {
  const [searchQuery,  setSearchQuery]  = useState('');
  const [angNo,        setAngNo]        = useState('');
  const [searchResults, setSearchResults] = useState<GurbaniLine[]>([]);
  const [selectedLines, setSelectedLines] = useState<GurbaniLine[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [audioFile,    setAudioFile]    = useState<File | null>(null);
  const [audioUrl,     setAudioUrl]     = useState('');
  const [trimStart,    setTrimStart]    = useState(0);
  const [trimEnd,      setTrimEnd]      = useState(0);
  const [meaningLang,  setMeaningLang]  = useState<'hindi' | 'english' | 'both'>('both');
  const [pipelineOk,   setPipelineOk]   = useState<boolean | null>(null);
  const [rendering,    setRendering]    = useState(false);
  const [jobId,        setJobId]        = useState<string | null>(null);

  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`).then(r => setPipelineOk(r.ok)).catch(() => setPipelineOk(false));
  }, []);

  // Search by keyword
  const searchGurbani = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`https://api.gurbaninow.com/v2/search/${encodeURIComponent(searchQuery)}?source=G&searchtype=1`);
      const d = await r.json();
      const shabads = d.shabads || [];
      const lines: GurbaniLine[] = shabads.flatMap((s: any) =>
        (s.lines || [s]).map((l: any) => {
          const line = l.line || l;
          return {
            gurmukhi: line?.gurmukhi?.unicode || '',
            english:  line?.translation?.english?.default || '',
            punjabi:  line?.translation?.punjabi?.default?.unicode || '',
            pageNo:   line?.pageno || 0,
            lineNo:   line?.lineno || 0,
            shabadId: s.shabadinfo?.shabadid || '',
          };
        })
      );
      setSearchResults(lines.slice(0, 20));
    } catch { setSearchResults([]); }
    setLoading(false);
  };

  // Search by Ang (page number)
  const searchByAng = async () => {
    const page = parseInt(angNo);
    if (!page || page < 1 || page > 1430) return;
    setLoading(true);
    try {
      const r = await fetch(`https://api.gurbaninow.com/v2/ang/${page}`);
      const d = await r.json();
      const pageData = d.page || [];
      const lines: GurbaniLine[] = pageData.map((item: any) => {
        const line = item.line || item;
        return {
          gurmukhi: line?.gurmukhi?.unicode || '',
          english:  line?.translation?.english?.default || '',
          punjabi:  line?.translation?.punjabi?.default?.unicode || '',
          pageNo:   page,
          lineNo:   line?.lineno || 0,
          shabadId: item?.shabadinfo?.shabadid || '',
        };
      });
      setSearchResults(lines);
    } catch { setSearchResults([]); }
    setLoading(false);
  };

  // Today's Hukamnama
  const loadHukamnama = async () => {
    setLoading(true);
    try {
      const r = await fetch('https://api.gurbaninow.com/v2/hukamnama/today');
      const d = await r.json();
      const hukamnama = d.hukamnama || [];
      const lines: GurbaniLine[] = hukamnama.map((item: any) => {
        const line = item.line || item;
        return {
          gurmukhi: line?.gurmukhi?.unicode || '',
          english:  line?.translation?.english?.default || '',
          punjabi:  line?.translation?.punjabi?.default?.unicode || '',
          pageNo:   d.hukamnamainfo?.pageno || 0,
          lineNo:   line?.lineno || 0,
          shabadId: d.hukamnamainfo?.shabadid || '',
        };
      });
      setSearchResults(lines);
    } catch { setSearchResults([]); }
    setLoading(false);
  };

  const toggleLine = (line: GurbaniLine) => {
    setSelectedLines(prev => {
      const exists = prev.find(l => l.gurmukhi === line.gurmukhi);
      if (exists) return prev.filter(l => l.gurmukhi !== line.gurmukhi);
      return [...prev, line];
    });
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAudioFile(f);
    setAudioUrl(URL.createObjectURL(f));
  };

  const renderVideo = async () => {
    if (!selectedLines.length || !audioFile) return;
    setRendering(true);
    try {
      // Upload audio
      const fd = new FormData();
      fd.append('audio', audioFile);
      fd.append('trimStart', String(trimStart));
      fd.append('trimEnd', String(trimEnd));
      fd.append('lines', JSON.stringify(selectedLines));
      fd.append('meaningLang', meaningLang);
      const r = await fetch(`${PIPELINE_URL}/pipeline/gurbani/render`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.jobId);
    } catch (e: unknown) { alert('Error: ' + (e instanceof Error ? e.message : 'unknown')); }
    setRendering(false);
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl">

      {/* Pipeline status */}
      <div className={`border rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs ${pipelineOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
        <div className={`w-2 h-2 rounded-full ${pipelineOk ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        {pipelineOk ? 'Pipeline online ✓' : 'Pipeline offline — run: npm run pipeline'}
      </div>

      {/* Header */}
      <Card>
        <div className="px-5 pt-5 pb-2 bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="font-black text-gray-900 text-base mb-0.5 flex items-center gap-2">
            <span className="text-2xl">🙏</span> Gurbani Video Creator
          </h2>
          <p className="text-gray-500 text-xs">Create beautiful videos from Sri Guru Granth Sahib Ji verses with audio trimming.</p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-4 pt-4">

          {/* Search options */}
          <div className="flex gap-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchGurbani()}
              placeholder="Search by first letters (Gurmukhi or Roman)..."
              className="flex-1 border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            <button onClick={searchGurbani} disabled={!searchQuery.trim() || loading}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
              {loading ? '⏳' : '🔍'}
            </button>
          </div>

          {/* Ang search + Hukamnama */}
          <div className="flex gap-2">
            <div className="flex gap-2 flex-1">
              <input value={angNo} onChange={e => setAngNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchByAng()}
                placeholder="Ang number (1-1430)"
                type="number" min="1" max="1430"
                className="flex-1 border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              <button onClick={searchByAng} disabled={!angNo || loading}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
                Go
              </button>
            </div>
            <button onClick={loadHukamnama} disabled={loading}
              className="border-2 border-amber-300 text-amber-700 hover:bg-amber-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
              📖 Today&apos;s Hukamnama
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">{searchResults.length} lines found</span>
                <span className="text-[10px] text-amber-600">{selectedLines.length} selected</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map((line, i) => {
                  const isSelected = selectedLines.find(l => l.gurmukhi === line.gurmukhi);
                  return (
                    <button key={i} onClick={() => toggleLine(line)}
                      className={`w-full px-4 py-3 text-left border-b border-gray-50 transition-colors ${isSelected ? 'bg-amber-100 border-l-4 border-l-amber-500' : 'hover:bg-amber-50'}`}>
                      <p className="text-sm font-bold text-gray-900 leading-relaxed" style={{ fontFamily: "'Noto Sans Gurmukhi', sans-serif" }}>
                        {line.gurmukhi}
                      </p>
                      {line.english && <p className="text-[11px] text-gray-500 mt-1">{line.english}</p>}
                      <p className="text-[9px] text-gray-400 mt-0.5">Ang {line.pageNo}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Selected verses */}
      {selectedLines.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
            <span className="font-bold text-amber-800 text-sm">🕉️ Selected Verses ({selectedLines.length})</span>
            <button onClick={() => setSelectedLines([])}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-1 rounded-lg">
              Clear all
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2">
            {selectedLines.map((line, i) => (
              <div key={i} className="flex items-start gap-3 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                <span className="text-amber-600 font-bold text-xs mt-1">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Noto Sans Gurmukhi', sans-serif" }}>
                    {line.gurmukhi}
                  </p>
                  {line.english && <p className="text-[10px] text-gray-500 mt-0.5">{line.english}</p>}
                </div>
                <button onClick={() => toggleLine(line)} className="text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Audio upload + trim */}
      {selectedLines.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 bg-amber-50">
            <span className="font-bold text-amber-800 text-sm">🎙️ Gurbani Audio</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Upload */}
            {!audioUrl ? (
              <label className="flex items-center gap-4 border-2 border-dashed border-amber-200 rounded-xl p-5 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-colors">
                <span className="text-3xl">🎵</span>
                <div>
                  <p className="text-sm font-bold text-gray-700">Upload Gurbani audio (MP3)</p>
                  <p className="text-[10px] text-gray-400">From SikhNet, your own recording, or any source</p>
                </div>
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              </label>
            ) : (
              <>
                {/* File info */}
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <span className="text-xl">✅</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-700">{audioFile?.name}</p>
                    <p className="text-[10px] text-gray-500">{audioFile ? `${Math.round(audioFile.size / 1024)}KB` : ''}</p>
                  </div>
                  <button onClick={() => { setAudioUrl(''); setAudioFile(null); }}
                    className="text-xs text-red-400 border border-red-200 px-2 py-1 rounded-lg">Change</button>
                </div>

                {/* Trim */}
                <AudioTrimmer
                  audioUrl={audioUrl}
                  onTrimChange={(s, e) => { setTrimStart(s); setTrimEnd(e); }}
                />
              </>
            )}

            {/* Meaning language */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Meaning narration language</label>
              <div className="flex gap-2">
                {(['hindi', 'english', 'both'] as const).map(l => (
                  <button key={l} onClick={() => setMeaningLang(l)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors capitalize ${meaningLang === l ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                    {l === 'both' ? 'Hindi + English' : l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Render button */}
      {selectedLines.length > 0 && audioUrl && (
        <button onClick={renderVideo} disabled={rendering || pipelineOk !== true}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-base py-4 rounded-xl transition-all flex items-center justify-center gap-2">
          {rendering ? <><span className="animate-spin">⚙️</span> Rendering…</> : <><span>🙏</span> Render Gurbani Video</>}
        </button>
      )}

      {/* SikhNet link for audio */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <p className="font-bold mb-1">📥 Where to get Gurbani audio:</p>
        <ul className="flex flex-col gap-0.5 text-blue-600">
          <li>• <a href="https://sikhnet.com/pages/learn-gurbani" target="_blank" rel="noopener noreferrer" className="underline">SikhNet Learn Gurbani</a> — per-pauri recordings, slow & clear</li>
          <li>• <a href="https://play.sikhnet.com" target="_blank" rel="noopener noreferrer" className="underline">SikhNet Gurbani Media</a> — full shabad kirtan tracks</li>
          <li>• Record your own voice — most personal & respectful</li>
        </ul>
      </div>
    </div>
  );
}

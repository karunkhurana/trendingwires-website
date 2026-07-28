'use client';
/**
 * KidsStudio.tsx
 * Admin panel for creating Cocomelon-style animated story videos.
 *
 * Flow:
 * 1. Enter story idea (e.g. "A story about sharing toys")
 * 2. AI generates scenes with characters, moods, text, voice lines
 * 3. Review + edit each scene
 * 4. Render → preview → publish to YouTube
 *
 * Completely separate from VideoStudio — does not touch existing pipeline.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── Types ─────────────────────────────────────────────────────────────────────
type CharWho   = 'raju' | 'priya' | 'none';
type CharMood  = 'happy' | 'sad' | 'surprised' | 'excited' | 'thinking' | 'waving';
type BgPreset  = 'sky' | 'sunset' | 'night' | 'garden' | 'indoors' | 'party' | 'beach';

type StoryScene = {
  id:         number;
  bg:         BgPreset;
  bgEmoji:    string;
  char1:      CharWho;
  char1Mood:  CharMood;
  char2:      CharWho;
  char2Mood:  CharMood;
  text:       string;     // on-screen caption
  voiceLine:  string;     // what narrator says
  durationSec: number;
};

type Story = {
  slug:       string;
  title:      string;
  moral:      string;
  scenes:     StoryScene[];
  voice:      string;     // TTS voice
  bgMusic:    string;
};

type LogLine = { msg: string };
type Job     = { id: string; status: string; log: LogLine[]; result: any; error: string | null };

// ─── Pollers ───────────────────────────────────────────────────────────────────
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
          setTimeout(poll, 1500);
      } catch { if (alive) setTimeout(poll, 3000); }
    };
    poll();
    return () => { alive = false; };
  }, [jobId]);
  return job;
}

// ─── BG presets ────────────────────────────────────────────────────────────────
const BG_PRESETS: Record<BgPreset, { gradient: string; label: string; emoji: string }> = {
  sky:      { gradient: 'linear-gradient(160deg, #87CEEB 0%, #98FB98 100%)', label: '🏡 Street', emoji: '🏘️' },
  sunset:   { gradient: 'linear-gradient(160deg, #FF8C00 0%, #FF6B6B 100%)', label: '🌆 Street (Evening)', emoji: '🌇' },
  night:    { gradient: 'linear-gradient(160deg, #1a1a2e 0%, #16213E 100%)', label: '🏠 Home',   emoji: '🏠' },
  garden:   { gradient: 'linear-gradient(160deg, #4CAF50 0%, #8BC34A 100%)', label: '🌳 Garden', emoji: '🌳' },
  indoors:  { gradient: 'linear-gradient(160deg, #FFD3A5 0%, #FFA07A 100%)', label: '🛋️ Indoors', emoji: '🛋️' },
  party:    { gradient: 'linear-gradient(160deg, #9C27B0 0%, #E91E63 100%)', label: '🎉 Party',  emoji: '🎉' },
  beach:    { gradient: 'linear-gradient(160deg, #00CED1 0%, #FFD700 100%)', label: '🌸 Garden 2', emoji: '🌸' },
};

const VOICES = [
  { id: 'en-IN-NeerjaExpressiveNeural', label: '🇮🇳 Neerja (Indian, Expressive)' },
  { id: 'en-IN-PrabhatNeural',          label: '🇮🇳 Prabhat (Indian Male)' },
  { id: 'hi-IN-SwaraNeural',            label: '🇮🇳 Swara (Hindi Female)' },
  { id: 'en-US-JennyNeural',            label: '🇺🇸 Jenny (US Female, Kid-friendly)' },
  { id: 'en-GB-SoniaNeural',            label: '🇬🇧 Sonia (UK Female)' },
];

const CHAR_MOODS: CharMood[] = ['happy', 'sad', 'surprised', 'excited', 'thinking', 'waving'];
const MOOD_EMOJIS: Record<CharMood, string> = {
  happy: '😄', sad: '😢', surprised: '😲', excited: '🤩', thinking: '🤔', waving: '👋',
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>{children}</div>
);

// ─── Scene Editor Card ─────────────────────────────────────────────────────────
function SceneCard({
  scene, index, total, onChange, onDelete,
}: {
  scene: StoryScene;
  index: number;
  total: number;
  onChange: (s: StoryScene) => void;
  onDelete: () => void;
}) {
  const bg = BG_PRESETS[scene.bg] || BG_PRESETS['sky'];

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Scene header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100"
        style={{ background: bg.gradient }}>
        <span className="text-sm font-black text-white drop-shadow">
          {bg.emoji} Scene {index + 1}
          {scene.bgEmoji !== bg.emoji && <span className="ml-2 text-lg">{scene.bgEmoji}</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/80 font-medium">{scene.durationSec}s</span>
          {total > 2 && (
            <button onClick={onDelete}
              className="text-white/70 hover:text-white text-[10px] border border-white/30 px-2 py-0.5 rounded-lg bg-black/20">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Background */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(BG_PRESETS) as BgPreset[]).map(k => (
            <button key={k} onClick={() => onChange({ ...scene, bg: k, bgEmoji: BG_PRESETS[k].emoji })}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${scene.bg === k ? 'border-red-400 bg-red-50 text-red-700 font-bold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {BG_PRESETS[k].label}
            </button>
          ))}
        </div>

        {/* Characters */}
        <div className="grid grid-cols-2 gap-3">
          {(['char1', 'char2'] as const).map(ch => (
            <div key={ch} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">{ch === 'char1' ? 'Left' : 'Right'} character</span>
              <select value={scene[ch]} onChange={e => onChange({ ...scene, [ch]: e.target.value as CharWho })}
                className="border border-gray-200 text-gray-700 bg-gray-50 px-2 py-1.5 rounded-lg text-xs">
                <option value="none">— None —</option>
                <option value="raju">Raju (Boy)</option>
                <option value="priya">Priya (Girl)</option>
              </select>
              {scene[ch] !== 'none' && (
                <div className="flex gap-1 flex-wrap">
                  {CHAR_MOODS.map(m => (
                    <button key={m}
                      onClick={() => onChange({ ...scene, [`${ch}Mood`]: m })}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${scene[`${ch}Mood` as 'char1Mood'|'char2Mood'] === m ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {MOOD_EMOJIS[m]} {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Caption text */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Caption (shown on screen)</label>
          <input value={scene.text} onChange={e => onChange({ ...scene, text: e.target.value })}
            placeholder="What appears on screen..."
            className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
        </div>

        {/* Voice line */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Narrator voice line</label>
          <textarea value={scene.voiceLine} onChange={e => onChange({ ...scene, voiceLine: e.target.value })}
            rows={2} placeholder="What the narrator says..."
            className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none" />
        </div>

        {/* Duration */}
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Duration</label>
          <input type="range" min="3" max="12" value={scene.durationSec}
            onChange={e => onChange({ ...scene, durationSec: parseInt(e.target.value) })}
            className="flex-1 accent-purple-500" />
          <span className="text-sm font-bold text-gray-600 w-10">{scene.durationSec}s</span>
        </div>
      </div>
    </div>
  );
}

// ─── Story preview card ─────────────────────────────────────────────────────────
function StoryPreview({ story, onEdit }: { story: Story; onEdit: () => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-purple-50">
        <div className="flex items-center gap-2">
          <span className="text-base">📖</span>
          <span className="font-black text-gray-800 text-sm">{story.title}</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
            {story.scenes.length} scenes
          </span>
        </div>
        <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg bg-white">
          ✏ Edit idea
        </button>
      </div>
      <div className="px-5 py-3 bg-purple-50/50 border-b border-gray-100">
        <p className="text-xs text-purple-700 font-medium">💡 Moral: {story.moral}</p>
      </div>
      <div className="px-4 py-4 flex flex-col gap-2">
        {story.scenes.map((s, i) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <span className="font-bold text-gray-400 flex-shrink-0 w-16">Scene {i+1}</span>
            <span className="text-purple-600 flex-shrink-0">{(BG_PRESETS[s.bg] || BG_PRESETS['sky']).emoji}</span>
            <span className="text-gray-600 flex-shrink-0">
              {s.char1 !== 'none' ? (s.char1 === 'raju' ? '👦' : '👧') : ''}
              {s.char2 !== 'none' ? (s.char2 === 'raju' ? '👦' : '👧') : ''}
            </span>
            <span className="text-gray-700 italic truncate">{s.text}</span>
            <span className="text-gray-400 flex-shrink-0">{s.durationSec}s</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Job progress ───────────────────────────────────────────────────────────────
function KidsJobProgress({ job, slug }: { job: Job; slug: string }) {
  const isDone   = job.status === 'done';
  const isFailed = job.status === 'error';
  const logText  = job.log.map(l => l.msg).join('\n');

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="font-bold text-gray-800 text-sm">🧒 Story Pipeline</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${isDone ? 'bg-green-50 text-green-600 border-green-200' : isFailed ? 'bg-red-50 text-red-500 border-red-200' : 'bg-purple-50 text-purple-600 border-purple-200 animate-pulse'}`}>
          {job.status.toUpperCase()}
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="bg-gray-900 rounded-xl p-3 max-h-40 overflow-y-auto flex flex-col gap-0.5">
          {job.log.map((l, i) => (
            <div key={i} className={`text-xs font-mono ${l.msg.startsWith('✓') || l.msg.startsWith('🎉') ? 'text-green-400' : l.msg.startsWith('❌') ? 'text-red-400' : l.msg.startsWith('⏭') ? 'text-gray-500' : 'text-gray-300'}`}>
              {l.msg}
            </div>
          ))}
          {!isDone && !isFailed && <div className="text-purple-400 text-xs font-mono animate-pulse">● generating story…</div>}
        </div>
      </div>
      {isFailed && <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">❌ {job.error}</div>}
      {isDone && job.result && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="relative mx-auto rounded-xl overflow-hidden bg-black border border-gray-200 shadow-lg" style={{ width: 200, aspectRatio: '9/16' }}>
            <video src={`${PIPELINE_URL}/pipeline/preview/${slug}`} controls className="w-full h-full object-cover" preload="metadata" />
          </div>
          <a href={`${PIPELINE_URL}/pipeline/preview/${slug}`} download={`${slug}.mp4`}
            className="w-full border border-gray-200 text-gray-600 text-sm font-bold py-3 px-4 rounded-xl text-center transition-colors bg-white hover:bg-gray-50">
            ⬇ Download Story MP4
          </a>
        </div>
      )}
    </Card>
  );
}

// ─── Main KidsStudio component ─────────────────────────────────────────────────
export function KidsStudio() {
  const [idea,        setIdea]        = useState('');
  const [language,    setLanguage]    = useState<'english' | 'hindi' | 'hinglish'>('english');
  const [voiceId,     setVoiceId]     = useState('en-IN-NeerjaExpressiveNeural');
  const [generating,  setGenerating]  = useState(false);
  const [story,       setStory]       = useState<Story | null>(null);
  const [editScenes,  setEditScenes]  = useState<StoryScene[]>([]);
  const [genErr,      setGenErr]      = useState('');
  const [jobId,       setJobId]       = useState<string | null>(null);
  const [rendering,   setRendering]   = useState(false);
  const [pipelineOk,  setPipelineOk]  = useState<boolean | null>(null);

  const job  = useJobPoller(jobId);
  const slug = story?.slug || '';
  const isRunning = job?.status === 'running' || job?.status === 'pending';

  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`).then(r => setPipelineOk(r.ok)).catch(() => setPipelineOk(false));
  }, []);

  // Keep editScenes in sync with story
  useEffect(() => { if (story) setEditScenes(story.scenes); }, [story]);

  const generateStory = async () => {
    if (!idea.trim()) return;
    setGenerating(true); setGenErr(''); setStory(null); setJobId(null);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/story/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, language, voiceId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      const d = await r.json();
      setStory(d.story);
    } catch (e: unknown) { setGenErr(e instanceof Error ? e.message : 'Failed'); }
    setGenerating(false);
  };

  const renderStory = async () => {
    if (!story) return;
    setRendering(true); setJobId(null);
    const finalStory = { ...story, scenes: editScenes, voice: voiceId };
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/story/render`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalStory),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.jobId);
    } catch (e: unknown) { alert('Render error: ' + (e instanceof Error ? e.message : 'unknown')); }
    setRendering(false);
  };

  const addScene = () => {
    const newScene: StoryScene = {
      id: Date.now(), bg: 'sky', bgEmoji: '☀️',
      char1: 'raju', char1Mood: 'happy',
      char2: 'none', char2Mood: 'happy',
      text: 'New scene', voiceLine: 'Narrator says...', durationSec: 5,
    };
    setEditScenes(prev => [...prev, newScene]);
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl">

      {/* Pipeline status */}
      <div className={`border rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs ${pipelineOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
        <div className={`w-2 h-2 rounded-full ${pipelineOk ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        {pipelineOk ? 'Pipeline online ✓' : 'Pipeline offline — run: npm run pipeline'}
      </div>

      {/* Story idea input */}
      <Card>
        <div className="px-5 pt-5 pb-2">
          <h2 className="font-black text-gray-900 text-base mb-0.5">🧒 Kids Story Creator</h2>
          <p className="text-gray-400 text-xs">Describe your story idea — AI creates scenes, characters and voice narration.</p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Story Idea *</label>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={3}
              placeholder="e.g. A story about Raju and Priya learning to share their toys. Moral: Sharing is caring."
              className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none placeholder:text-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value as typeof language)}
                className="w-full border border-gray-200 text-gray-700 bg-gray-50 px-3 py-2 rounded-xl text-sm">
                <option value="english">English</option>
                <option value="hindi">हिंदी</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Narrator Voice</label>
              <select value={voiceId} onChange={e => setVoiceId(e.target.value)}
                className="w-full border border-gray-200 text-gray-700 bg-gray-50 px-3 py-2 rounded-xl text-sm">
                {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {genErr && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">{genErr}</div>}

          <button onClick={generateStory} disabled={!idea.trim() || generating || pipelineOk !== true}
            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {generating ? <><span className="animate-spin text-base">✨</span> AI is creating your story…</> : <><span>📖</span> Generate Story with AI</>}
          </button>

          {/* Example ideas */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Try these:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Raju learns to share his toys with Priya',
                'Priya is scared of the dark — learns to be brave',
                'Raju and Priya plant a tree together',
                'Priya helps Mama in the kitchen',
              ].map(ex => (
                <button key={ex} onClick={() => setIdea(ex)}
                  className="text-xs border border-purple-200 text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-full bg-white transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Story scenes editor */}
      {story && !isRunning && (
        <>
          <StoryPreview story={story} onEdit={() => { setStory(null); setJobId(null); }} />

          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="font-bold text-gray-800 text-sm">🎬 Edit Scenes</span>
              <button onClick={addScene}
                className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                + Add Scene
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {editScenes.map((scene, i) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  index={i}
                  total={editScenes.length}
                  onChange={updated => setEditScenes(prev => prev.map((s, j) => j === i ? updated : s))}
                  onDelete={() => setEditScenes(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </Card>

          {/* Render button */}
          <button onClick={renderStory} disabled={rendering || isRunning}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-100 flex items-center justify-center gap-2">
            {rendering ? <><span className="animate-spin">⚙️</span> Starting render…</> : <><span>🚀</span> Render Story Video</>}
          </button>
        </>
      )}

      {/* Job progress */}
      {jobId && (
        job
          ? <KidsJobProgress job={job} slug={slug} />
          : <Card>
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="animate-spin text-xl">⚙️</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Starting story pipeline…</p>
                  <p className="text-xs text-gray-400 mt-0.5">Generating voices and rendering</p>
                </div>
              </div>
            </Card>
      )}
    </div>
  );
}

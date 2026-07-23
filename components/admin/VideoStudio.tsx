'use client';
import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type VideoType = 'tw-short' | 'text-image' | 'news-flash';
type Voice     = 'en-US-AndrewNeural' | 'en-US-AriaNeural' | 'en-US-GuyNeural' | 'en-US-JennyNeural';
type AccentColor = '#E50914' | '#38BDF8' | '#A78BFA' | '#34D399' | '#FFD700' | '#FF6B6B';

const CATEGORIES = ['AI & TECH','BUSINESS','WORLD NEWS','SCIENCE','INNOVATION','SOCIAL MEDIA','EDUCATION','HEALTH'];
const VOICES: { id: Voice; label: string }[] = [
  { id: 'en-US-AndrewNeural', label: '🎙️ Andrew (Professional Male)' },
  { id: 'en-US-AriaNeural',   label: '🎙️ Aria (Warm Female)' },
  { id: 'en-US-GuyNeural',    label: '🎙️ Guy (Confident Male)' },
  { id: 'en-US-JennyNeural',  label: '🎙️ Jenny (Friendly Female)' },
];
const ACCENTS: { color: AccentColor; label: string }[] = [
  { color: '#E50914', label: '🔴 TrendingWires Red' },
  { color: '#38BDF8', label: '🔵 Electric Blue' },
  { color: '#A78BFA', label: '🟣 Purple' },
  { color: '#34D399', label: '🟢 Green' },
  { color: '#FFD700', label: '🟡 Gold' },
  { color: '#FF6B6B', label: '🩷 Pink' },
];

type VideoScript = {
  slug:           string;
  videoType:      VideoType;
  // Content
  hookLine:       string;
  hookSub:        string;
  factLine:       string;
  voiceHook:      string;
  voiceFact:      string;
  voiceCta:       string;
  // Style
  category:       string;
  accentColor:    AccentColor;
  voice:          Voice;
  bgMusic:        boolean;
  // Image (for text-image type)
  imageUrl:       string;
  imageMotion:    'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none';
  // YouTube metadata
  title:          string;
  description:    string;
  hashtags:       string;
  uploadToYT:     boolean;
};

const DEFAULT: VideoScript = {
  slug:        '',
  videoType:   'tw-short',
  hookLine:    '',
  hookSub:     '',
  factLine:    '',
  voiceHook:   '',
  voiceFact:   '',
  voiceCta:    'Subscribe to TrendingWires for more AI and tech updates.',
  category:    'AI & TECH',
  accentColor: '#E50914',
  voice:       'en-US-AndrewNeural',
  bgMusic:     true,
  imageUrl:    '',
  imageMotion: 'zoom-in',
  title:       '',
  description: '',
  hashtags:    '#TrendingWires #Shorts',
  uploadToYT:  false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,60);
}

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
    <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
      <span>{icon}</span> {title}
    </h3>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

// ─── Field wrappers ───────────────────────────────────────────────────────────
const Label = ({ children, optional }: { children: React.ReactNode; optional?: boolean }) => (
  <label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
    {children} {optional && <span className="text-gray-600 normal-case tracking-normal">optional</span>}
  </label>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#E50914] text-sm transition-colors ${props.className || ''}`} />
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={`w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#E50914] text-sm resize-none transition-colors ${props.className || ''}`} />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select {...props} className={`w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#E50914] text-sm transition-colors ${props.className || ''}`} />
);

// ─── Job status poller ────────────────────────────────────────────────────────
function useJobPoller(jobId: string | null) {
  const [job, setJob] = useState<{ status: string; log: {msg:string}[]; result: { youtubeUrl?: string; videoPath?: string } | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const r = await fetch(`${PIPELINE_URL}/pipeline/status/${jobId}`);
        if (!r.ok) return;
        const d = await r.json();
        setJob(d);
        if (d.status === 'running' || d.status === 'pending') {
          setTimeout(poll, 1500);
        }
      } catch {
        setTimeout(poll, 3000);
      }
    };
    poll();
  }, [jobId]);

  return job;
}

// ─── Main Studio Component ────────────────────────────────────────────────────
export function VideoStudio() {
  const [form, setForm]         = useState<VideoScript>(DEFAULT);
  const [jobId, setJobId]       = useState<string | null>(null);
  const [running, setRunning]   = useState(false);
  const [pipelineOk, setPipelineOk] = useState<boolean | null>(null);
  const [voiceJobId, setVoiceJobId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const job = useJobPoller(jobId);
  const voiceJob = useJobPoller(voiceJobId);

  // Check pipeline server is alive
  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`)
      .then(r => setPipelineOk(r.ok))
      .catch(() => setPipelineOk(false));
  }, []);

  const set = (k: keyof VideoScript, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill slug from title
  const setTitle = (v: string) => {
    setForm(f => ({ ...f, title: v, slug: f.slug || toSlug(v) }));
  };

  // Auto-fill description template
  const autoDescription = () => {
    const hashtags = form.hashtags || '#TrendingWires #Shorts';
    const desc = [
      form.factLine || form.hookLine,
      '',
      '─────────────────────',
      '0:00  Hook',
      '0:04  The Fact',
      '0:12  Subscribe',
      '─────────────────────',
      '',
      '🌐 https://trendingwires.com',
      '📺 Subscribe: https://youtube.com/@trendingwires?sub_confirmation=1',
      '📸 https://instagram.com/trending_wires',
      '🐦 https://x.com/trending_wires',
      '',
      hashtags,
    ].join('\n');
    set('description', desc);
  };

  // Generate voice preview
  const previewVoice = async () => {
    if (!form.voiceHook) return;
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/voice-only`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildScript(), _noUpload: true }),
      });
      const d = await r.json();
      setVoiceJobId(d.jobId);
    } catch { alert('Pipeline server not running. Start it with: npm run pipeline'); }
  };

  // Build final script object
  const buildScript = (): VideoScript & { _voice: Voice; _noUpload: boolean } => ({
    ...form,
    slug:      form.slug || toSlug(form.title || form.hookLine),
    _voice:    form.voice,
    _noUpload: !form.uploadToYT,
  });

  // Run full pipeline
  const runPipeline = async () => {
    if (!form.hookLine || !form.voiceHook) {
      alert('Please fill in Hook Line and Voice Hook at minimum.');
      return;
    }
    setRunning(true);
    setJobId(null);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildScript()),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.jobId);
    } catch (e: unknown) {
      alert(`Failed to start pipeline: ${e instanceof Error ? e.message : 'Unknown error'}\n\nMake sure the pipeline server is running:\nnpm run pipeline`);
    }
    setRunning(false);
  };

  const isDone    = job?.status === 'done';
  const isRunning = job?.status === 'running' || job?.status === 'pending';
  const isFailed  = job?.status === 'error';
  const videoSlug = form.slug || toSlug(form.title || form.hookLine || 'preview');

  return (
    <div className="flex flex-col gap-6">

      {/* Pipeline status indicator */}
      <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${pipelineOk === true ? 'bg-green-400' : pipelineOk === false ? 'bg-red-400' : 'bg-yellow-400'}`} />
          <span className="text-xs text-gray-400">
            Pipeline server {pipelineOk === true ? 'online' : pipelineOk === false ? 'offline — run: npm run pipeline' : 'checking…'}
          </span>
        </div>
        <button onClick={() => fetch(`${PIPELINE_URL}/health`).then(r => setPipelineOk(r.ok)).catch(() => setPipelineOk(false))}
          className="text-xs text-gray-600 hover:text-white transition-colors">↻ Check</button>
      </div>

      {/* ── Video type ── */}
      <Section title="Video Type" icon="🎬">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'tw-short',    label: '⚡ TW Short',     desc: 'Hook → Fact → CTA' },
            { id: 'text-image',  label: '🖼️ Text + Image',  desc: 'Image with motion + text overlay' },
            { id: 'news-flash',  label: '📡 News Flash',    desc: 'Breaking news style' },
          ].map(t => (
            <button key={t.id} onClick={() => set('videoType', t.id)}
              className={`p-3 rounded-xl border text-left transition-all ${form.videoType === t.id ? 'border-[#E50914] bg-[#E50914]/10' : 'border-[#222] hover:border-[#444]'}`}>
              <div className="text-white text-sm font-bold">{t.label}</div>
              <div className="text-gray-500 text-xs mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">

          {/* ── Script content ── */}
          <Section title="Script Content" icon="📝">
            <div><Label>Hook Line * <span className="text-gray-600 text-xs normal-case">(ALL CAPS, \n for line break)</span></Label>
              <Textarea value={form.hookLine} onChange={e => set('hookLine', e.target.value)} rows={2}
                placeholder={"KIRO BUILDS\nAI AGENTS"} /></div>
            <div><Label optional>Hook Subtitle</Label>
              <Input value={form.hookSub} onChange={e => set('hookSub', e.target.value)}
                placeholder="And it takes under 10 minutes." /></div>
            <div><Label>Fact Line * <span className="text-gray-600 text-xs normal-case">(\n for line break)</span></Label>
              <Textarea value={form.factLine} onChange={e => set('factLine', e.target.value)} rows={2}
                placeholder={"Describe your feature in plain English.\nKiro writes specs, plan, and code."} /></div>

            {/* Image options for text-image type */}
            {form.videoType === 'text-image' && (
              <>
                <div><Label>Image URL *</Label>
                  <Input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg or upload below" /></div>
                <div><Label>Image Motion Effect</Label>
                  <Select value={form.imageMotion} onChange={e => set('imageMotion', e.target.value as typeof form.imageMotion)}>
                    <option value="zoom-in">🔍 Zoom In (Ken Burns)</option>
                    <option value="zoom-out">🔎 Zoom Out</option>
                    <option value="pan-left">← Pan Left</option>
                    <option value="pan-right">→ Pan Right</option>
                    <option value="none">None</option>
                  </Select>
                </div>
              </>
            )}
          </Section>

          {/* ── Voice script ── */}
          <Section title="Voice Script (spoken text)" icon="🎙️">
            <div><Label>Voice Hook *</Label>
              <Textarea value={form.voiceHook} onChange={e => set('voiceHook', e.target.value)} rows={2}
                placeholder="Kiro just changed how developers build AI agents." /></div>
            <div><Label>Voice Fact *</Label>
              <Textarea value={form.voiceFact} onChange={e => set('voiceFact', e.target.value)} rows={2}
                placeholder="You describe what you want, and Kiro writes the code automatically." /></div>
            <div><Label optional>Voice CTA</Label>
              <Input value={form.voiceCta} onChange={e => set('voiceCta', e.target.value)}
                placeholder="Subscribe to TrendingWires for more AI updates." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Voice</Label>
                <Select value={form.voice} onChange={e => set('voice', e.target.value as Voice)}>
                  {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              </div>
              <div className="flex items-end">
                <button onClick={previewVoice}
                  disabled={!form.voiceHook || pipelineOk !== true}
                  className="w-full bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-40">
                  {voiceJob?.status === 'running' ? '⏳ Generating…' : '▶ Preview Voice'}
                </button>
              </div>
            </div>
            {voiceJob?.status === 'done' && (
              <div className="bg-green-900/20 border border-green-700/40 rounded-xl px-3 py-2 text-green-400 text-xs">✓ Voice generated successfully</div>
            )}
          </Section>

          {/* ── Style ── */}
          <Section title="Style & Settings" icon="🎨">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div><Label>Accent Color</Label>
                <Select value={form.accentColor} onChange={e => set('accentColor', e.target.value as AccentColor)}>
                  {ACCENTS.map(a => <option key={a.color} value={a.color}>{a.label}</option>)}
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors ${form.bgMusic ? 'bg-[#E50914]' : 'bg-[#333]'} relative`}
                onClick={() => set('bgMusic', !form.bgMusic)}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${form.bgMusic ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-gray-300">Background music (bgm.mp3)</span>
            </label>
          </Section>
        </div>

        <div className="flex flex-col gap-4">

          {/* ── YouTube metadata ── */}
          <Section title="YouTube Details" icon="📺">
            <div><Label>Video Title *</Label>
              <Input value={form.title} onChange={e => setTitle(e.target.value)}
                placeholder="I Built an AI Agent in Kiro — Here's How" /></div>
            <div><Label optional>URL Slug <span className="text-gray-600 text-xs">(auto-generated)</span></Label>
              <Input value={form.slug} onChange={e => set('slug', toSlug(e.target.value))}
                placeholder="auto-filled from title" /></div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label optional>Description</Label>
                <button onClick={autoDescription} className="text-xs text-[#E50914] hover:text-red-400 transition-colors">Auto-fill ↗</button>
              </div>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5}
                placeholder="YouTube video description with chapters and links…" />
            </div>
            <div><Label optional>Hashtags</Label>
              <Input value={form.hashtags} onChange={e => set('hashtags', e.target.value)}
                placeholder="#TrendingWires #Shorts #AINews" /></div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors ${form.uploadToYT ? 'bg-[#E50914]' : 'bg-[#333]'} relative`}
                onClick={() => set('uploadToYT', !form.uploadToYT)}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${form.uploadToYT ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-gray-300">Upload to YouTube after render</span>
            </label>
            {form.uploadToYT && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-3 py-2 text-yellow-400 text-xs">
                ⚠ Requires YouTube OAuth setup. Run: <code className="bg-black px-1 rounded">npm run auth:youtube</code>
              </div>
            )}
          </Section>

          {/* ── Run button ── */}
          <button
            onClick={runPipeline}
            disabled={running || isRunning || pipelineOk !== true}
            className="w-full bg-[#E50914] hover:bg-[#FF1A1A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(229,9,20,0.4)] flex items-center justify-center gap-3"
          >
            {isRunning ? (
              <><span className="animate-spin text-xl">⚙️</span> Pipeline Running…</>
            ) : running ? (
              <><span className="animate-pulse">⏳</span> Starting…</>
            ) : (
              <><span>🚀</span> Run Pipeline & {form.uploadToYT ? 'Publish to YouTube' : 'Render Video'}</>
            )}
          </button>

          {/* ── Progress log ── */}
          {job && (
            <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">Pipeline Log</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isDone ? 'bg-green-900/40 text-green-400' :
                  isFailed ? 'bg-red-900/40 text-red-400' :
                  'bg-yellow-900/40 text-yellow-400'}`}>
                  {job.status.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {job.log.map((l, i) => (
                  <div key={i} className="text-xs text-gray-400 font-mono">{l.msg}</div>
                ))}
                {isRunning && <div className="text-xs text-yellow-400 font-mono animate-pulse">● Processing…</div>}
              </div>
              {isFailed && (
                <div className="mt-3 bg-red-900/20 border border-red-700/40 rounded-xl px-3 py-2 text-red-400 text-xs">
                  ❌ {job.error}
                </div>
              )}
            </div>
          )}

          {/* ── Result / Preview ── */}
          {isDone && job?.result && (
            <div className="bg-[#0A0A0A] border border-green-700/40 rounded-2xl p-4 flex flex-col gap-4">
              <div className="text-green-400 font-bold text-sm">🎉 Pipeline Complete!</div>

              {/* Video preview */}
              <div className="relative aspect-[9/16] max-h-80 mx-auto w-44 bg-black rounded-xl overflow-hidden border border-[#222]">
                <video
                  ref={videoRef}
                  src={`${PIPELINE_URL}/pipeline/preview/${videoSlug}`}
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <a href={`${PIPELINE_URL}/pipeline/preview/${videoSlug}`} download={`${videoSlug}.mp4`}
                  className="bg-[#1A1A1A] hover:bg-[#222] text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors border border-[#333]">
                  ⬇ Download MP4
                </a>
                {job.result.youtubeUrl ? (
                  <a href={job.result.youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors">
                    ▶ View on YouTube
                  </a>
                ) : form.uploadToYT ? (
                  <div className="bg-yellow-900/20 text-yellow-400 text-xs py-2.5 px-4 rounded-xl text-center border border-yellow-700/40">
                    ⚠ Upload failed
                  </div>
                ) : (
                  <button onClick={() => {/* trigger upload separately */}}
                    className="bg-[#1A1A1A] hover:bg-[#E50914] text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors border border-[#333]">
                    📤 Upload to YouTube
                  </button>
                )}
              </div>

              {job.result.youtubeUrl && (
                <div className="bg-green-900/20 border border-green-700/40 rounded-xl px-3 py-2 text-center">
                  <a href={job.result.youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="text-green-400 text-sm font-bold hover:text-green-300 transition-colors break-all">
                    {job.result.youtubeUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── Types ────────────────────────────────────────────────────────────────────
type JobResult = { youtubeUrl?: string; videoPath?: string; thumbPath?: string };
type LogLine   = { msg: string };
type Job       = { id: string; status: string; log: LogLine[]; result: JobResult | null; error: string | null };
type Script    = Record<string, unknown>;

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
      .then(r => r.json())
      .then(d => setYtStatus(d.status))
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
      {ytStatus === 'authed' && (
        <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-medium">✅ YouTube connected</span>
      )}
      {ytStatus === 'not-authed' && (
        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
          ⚠️ YouTube not connected — run <code className="font-mono bg-amber-100 px-1 rounded">npm run auth:youtube</code>
        </span>
      )}
    </div>
  );
}

// ─── Script preview card ──────────────────────────────────────────────────────
function ScriptPreview({
  script, onEdit, onRun, running,
}: {
  script: Script;
  onEdit: () => void;
  onRun: (uploadToYT: boolean) => void;
  running: boolean;
}) {
  const [uploadToYT, setUploadToYT] = useState(false);

  const field = (label: string, value: string | undefined | null, mono = false): JSX.Element | null => value ? (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">{label}</span>
      <span className={`text-sm text-gray-800 leading-relaxed whitespace-pre-line ${mono ? 'font-mono text-xs' : ''}`}>{String(value)}</span>
    </div>
  ) : null;

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
          {!!script.imageUrl && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Image</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={String(script.imageUrl)} alt="video bg" className="w-full h-28 object-cover rounded-xl border border-gray-100" />
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

      {/* Publish controls */}
      <div className="px-5 pb-5 flex flex-col gap-3">
        {/* textInImage toggle — shown only for text-image type */}
        {(script.videoType as string) === 'text-image' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-blue-700">Image content mode</p>
            <div className="flex gap-2">
              {[
                { value: false, label: '🖼️ Photo/Background', desc: 'Image has no text — we overlay our hook/fact' },
                { value: true,  label: '📊 Has Text/Infographic', desc: 'Image has its own text — we stay out of the way' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => { const updated = { ...script, textInImage: opt.value }; onEdit(); setTimeout(() => {}, 0); }}
                  className={`flex-1 p-2.5 rounded-lg border text-left text-xs transition-all ${
                    !!(script.textInImage) === opt.value
                      ? 'border-blue-400 bg-blue-100 text-blue-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="font-bold">{opt.label}</div>
                  <div className="text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${uploadToYT ? 'bg-red-500' : 'bg-gray-200'}`}
            onClick={() => setUploadToYT(!uploadToYT)}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${uploadToYT ? 'left-4' : 'left-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600">Upload to YouTube after render</span>
        </label>

        <button
          onClick={() => onRun(uploadToYT)}
          disabled={running}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-red-100 flex items-center justify-center gap-2"
        >
          {running
            ? <><span className="animate-spin">⚙️</span> Running pipeline…</>
            : <><span>🚀</span> {uploadToYT ? 'Render & Publish to YouTube' : 'Render Video'}</>
          }
        </button>
      </div>
    </Card>
  );
}

// ─── Job progress ─────────────────────────────────────────────────────────────
function JobProgress({ job, slug }: { job: Job; slug: string }) {
  const isDone   = job.status === 'done';
  const isFailed = job.status === 'error';
  const steps = [
    { key: '🎙️ Generating voiceover',   done: false },
    { key: '🎬 Rendering video',         done: false },
    { key: '🖼️ Generating thumbnail',    done: false },
    { key: '📤 Uploading to YouTube',    done: false },
  ];
  const logText = job.log.map(l => l.msg).join('\n');
  steps[0].done = logText.includes('Voiceover done');
  steps[1].done = logText.includes('Video rendered');
  steps[2].done = logText.includes('Thumbnail ready');
  steps[3].done = !!(job.result?.youtubeUrl);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="font-bold text-gray-800 text-sm">Pipeline Progress</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
          isDone ? 'bg-green-50 text-green-600 border-green-200' :
          isFailed ? 'bg-red-50 text-red-500 border-red-200' :
          'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
        }`}>{job.status.toUpperCase()}</span>
      </div>

      {/* Step indicators */}
      <div className="px-5 py-4 grid grid-cols-2 gap-2">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs ${s.done ? 'text-green-600' : 'text-gray-400'}`}>
            <span>{s.done ? '✅' : logText.includes(s.key.split(' ')[1]) ? '⏳' : '○'}</span>
            <span className={s.done ? 'font-medium' : ''}>{s.key}</span>
          </div>
        ))}
      </div>

      {/* Live log */}
      <div className="px-5 pb-4">
        <div className="bg-gray-900 rounded-xl p-3 max-h-40 overflow-y-auto flex flex-col gap-0.5">
          {job.log.map((l, i) => (
            <div key={i} className={`text-xs font-mono ${
              l.msg.startsWith('✓') || l.msg.startsWith('🎉') ? 'text-green-400' :
              l.msg.startsWith('❌') ? 'text-red-400' :
              l.msg.startsWith('⏭') ? 'text-gray-500' : 'text-gray-300'
            }`}>{l.msg}</div>
          ))}
          {!isDone && !isFailed && <div className="text-amber-400 text-xs font-mono animate-pulse">● processing…</div>}
        </div>
      </div>

      {isFailed && (
        <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          ❌ {job.error}
        </div>
      )}

      {/* Result */}
      {isDone && job.result && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="text-sm font-bold text-green-600">🎉 Done!</div>
          <div className="flex gap-2">
            <a href={`${PIPELINE_URL}/pipeline/preview/${slug}`} download={`${slug}.mp4`}
              className="flex-1 border border-gray-200 text-gray-600 hover:text-gray-800 text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors bg-white hover:bg-gray-50">
              ⬇ Download MP4
            </a>
            {job.result.youtubeUrl ? (
              <a href={job.result.youtubeUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors">
                ▶ View on YouTube
              </a>
            ) : (
              <div className="flex-1 border border-gray-100 text-gray-300 text-xs py-2.5 px-4 rounded-xl text-center">
                Not uploaded
              </div>
            )}
          </div>
          {job.result.youtubeUrl && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
              <a href={job.result.youtubeUrl} target="_blank" rel="noopener noreferrer"
                className="text-green-600 text-xs font-bold hover:underline break-all">{job.result.youtubeUrl}</a>
            </div>
          )}
          {/* Inline preview */}
          <div className="mx-auto w-36 rounded-2xl overflow-hidden bg-black border border-gray-200 shadow" style={{ aspectRatio: '9/16' }}>
            <video src={`${PIPELINE_URL}/pipeline/preview/${slug}`} controls className="w-full h-full object-cover" preload="metadata" />
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Studio ──────────────────────────────────────────────────────────────
export function VideoStudio() {
  const [topic,       setTopic]       = useState('');
  const [instructions,setInstructions]= useState('');
  const [researching, setResearching] = useState(false);
  const [script,      setScript]      = useState<Script | null>(null);
  const [researchErr, setResearchErr] = useState('');
  const [jobId,       setJobId]       = useState<string | null>(null);
  const [running,     setRunning]     = useState(false);
  const [pipelineOk,  setPipelineOk]  = useState<boolean | null>(null);

  const job = useJobPoller(jobId);
  const slug = String(script?.slug || '');

  // Check pipeline health
  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`).then(r => setPipelineOk(r.ok)).catch(() => setPipelineOk(false));
  }, []);

  // Research — AI fills everything
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
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Research failed');
      }
      const d = await r.json();
      setScript(d.script);
    } catch (e: unknown) {
      setResearchErr(e instanceof Error ? e.message : 'Failed. Is the pipeline server running?');
    }
    setResearching(false);
  };

  // Run full pipeline
  const run = async (uploadToYT: boolean) => {
    if (!script) return;
    setRunning(true);
    setJobId(null);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...script, _noUpload: !uploadToYT }),
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

      {/* Pipeline status */}
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
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && research()}
              placeholder="e.g. Claude 4 beats GPT-4o on every benchmark"
              className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Instructions <span className="text-gray-300 font-normal normal-case tracking-normal">optional</span>
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Make it punchy for developers. Use blue accent. Target audience: software engineers. Include the 99.7% accuracy stat."
              className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all placeholder:text-gray-300 resize-none"
            />
          </div>

          {researchErr && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">{researchErr}</div>
          )}

          <button
            onClick={research}
            disabled={!topic.trim() || researching || pipelineOk !== true}
            className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {researching
              ? <><span className="animate-spin text-base">✨</span> AI is filling the script…</>
              : <><span>✨</span> Generate Script with AI</>
            }
          </button>

          {/* Example prompts */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Try these:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'OpenAI just released o3 — what developers need to know',
                'India becomes 3rd largest economy',
                'This AI replaces 50% of coding jobs',
                'NASA confirmed water on Mars',
              ].map(ex => (
                <button key={ex} onClick={() => setTopic(ex)}
                  className="text-xs border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 px-3 py-1.5 rounded-full bg-white transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Script preview (filled by AI) ── */}
      {script && !isRunning && !jobId && (
        <ScriptPreview
          script={script}
          onEdit={() => { setScript(null); setJobId(null); }}
          onRun={run}
          running={running}
        />
      )}

      {/* ── Job progress ── */}
      {jobId && job && (
        <JobProgress job={job} slug={slug} />
      )}
    </div>
  );
}

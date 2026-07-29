'use client';
/**
 * QuizStudio.tsx
 * Admin panel for creating animated quiz videos (100% free, pure Remotion)
 */

import { useState, useEffect } from 'react';
import { PexelsVideoBrowser } from './PexelsVideoBrowser';

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuizOption = { label: string; text: string; correct: boolean };
type Difficulty = 'easy' | 'medium' | 'hard';
type QuizQuestion = {
  id: number; question: string; options: QuizOption[];
  explanation: string; category: string; difficulty: Difficulty;
};
type QuizConfig = {
  title: string; topic: string; slug: string;
  questions: QuizQuestion[];
  accentColor: string; bgColor: string;
  bgVideoPath?: string;  // local public/ path after download
};
type LogLine = { msg: string };
type Job = { id: string; status: string; log: LogLine[]; result: any; error: string | null };

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
          setTimeout(poll, 1500);
      } catch { if (alive) setTimeout(poll, 3000); }
    };
    poll();
    return () => { alive = false; };
  }, [jobId]);
  return job;
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>{children}</div>
);

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Question editor card ─────────────────────────────────────────────────────
function QuestionCard({
  q, index, total, onChange, onDelete,
}: {
  q: QuizQuestion; index: number; total: number;
  onChange: (q: QuizQuestion) => void; onDelete: () => void;
}) {
  const labels = ['A', 'B', 'C', 'D'];

  const setCorrect = (i: number) => {
    onChange({
      ...q,
      options: q.options.map((o, j) => ({ ...o, correct: j === i })),
    });
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-indigo-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-indigo-800">Q{index + 1}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFF_COLORS[q.difficulty]}`}>
            {q.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select value={q.difficulty} onChange={e => onChange({ ...q, difficulty: e.target.value as Difficulty })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {total > 2 && (
            <button onClick={onDelete}
              className="text-gray-400 hover:text-red-500 text-[10px] border border-gray-200 px-2 py-0.5 rounded-lg bg-white">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Question text */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Question</label>
          <textarea value={q.question} onChange={e => onChange({ ...q, question: e.target.value })}
            rows={2} placeholder="Question text..."
            className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>

        {/* Options */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
            Options <span className="text-indigo-500 normal-case">(click radio to mark correct)</span>
          </label>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${opt.correct ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  onClick={() => setCorrect(i)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors ${opt.correct ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-500 hover:border-indigo-400'}`}>
                  {labels[i]}
                </button>
                <input
                  value={opt.text}
                  onChange={e => onChange({ ...q, options: q.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o) })}
                  placeholder={`Option ${labels[i]}...`}
                  className={`flex-1 bg-transparent text-sm focus:outline-none ${opt.correct ? 'text-green-800 font-semibold' : 'text-gray-700'}`}
                />
                {opt.correct && <span className="text-green-600 text-xs font-bold flex-shrink-0">✓ Correct</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Explanation (shown after answer)</label>
          <input value={q.explanation} onChange={e => onChange({ ...q, explanation: e.target.value })}
            placeholder="Why is this the correct answer?"
            className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      </div>
    </div>
  );
}

// ─── Job progress ─────────────────────────────────────────────────────────────
function QuizJobProgress({ job, slug }: { job: Job; slug: string }) {
  const isDone   = job.status === 'done';
  const isFailed = job.status === 'error';
  const previewSlug = `quiz-${slug}`;

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="font-bold text-gray-800 text-sm">🧠 Quiz Pipeline</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${isDone ? 'bg-green-50 text-green-600 border-green-200' : isFailed ? 'bg-red-50 text-red-500 border-red-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200 animate-pulse'}`}>
          {job.status.toUpperCase()}
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="bg-gray-900 rounded-xl p-3 max-h-40 overflow-y-auto flex flex-col gap-0.5">
          {job.log.map((l, i) => (
            <div key={i} className={`text-xs font-mono ${l.msg.startsWith('✓') || l.msg.startsWith('🎉') ? 'text-green-400' : l.msg.startsWith('❌') ? 'text-red-400' : 'text-gray-300'}`}>
              {l.msg}
            </div>
          ))}
          {!isDone && !isFailed && <div className="text-indigo-400 text-xs font-mono animate-pulse">● rendering…</div>}
        </div>
      </div>

      {isFailed && <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">❌ {job.error}</div>}

      {isDone && job.result && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="relative mx-auto rounded-xl overflow-hidden bg-black border border-gray-200 shadow-lg" style={{ width: 200, aspectRatio: '9/16' }}>
            <video src={`${PIPELINE_URL}/pipeline/preview/${previewSlug}`} controls className="w-full h-full object-cover" preload="metadata" />
          </div>
          <a href={`${PIPELINE_URL}/pipeline/preview/${previewSlug}`} download={`${previewSlug}.mp4`}
            className="w-full border border-gray-200 text-gray-600 text-sm font-bold py-3 px-4 rounded-xl text-center transition-colors bg-white hover:bg-gray-50">
            ⬇ Download Quiz MP4
          </a>
        </div>
      )}
    </Card>
  );
}

// ─── Main QuizStudio ──────────────────────────────────────────────────────────
export function QuizStudio() {
  const [topic,        setTopic]        = useState('');
  const [numQ,         setNumQ]         = useState(5);
  const [difficulty,   setDifficulty]   = useState('mixed');
  const [language,     setLanguage]     = useState('english');
  const [voice,        setVoice]        = useState('en-IN-NeerjaExpressiveNeural');
  const [ttsRate,      setTtsRate]      = useState(25);
  const [voicePreview, setVoicePreview] = useState<HTMLAudioElement | null>(null);
  const [previewing,   setPreviewing]   = useState(false);
  const [bgVideoPath,  setBgVideoPath]  = useState('');
  const [bgVideoThumb, setBgVideoThumb] = useState('');
  const [generating,   setGenerating]   = useState(false);
  const [quiz,         setQuiz]         = useState<QuizConfig | null>(null);
  const [editQs,       setEditQs]       = useState<QuizQuestion[]>([]);
  const [genErr,       setGenErr]       = useState('');
  const [jobId,        setJobId]        = useState<string | null>(null);
  const [rendering,    setRendering]    = useState(false);
  const [ytUploading,  setYtUploading]  = useState(false);
  const [ytUrl,        setYtUrl]        = useState('');
  const [ytErr,        setYtErr]        = useState('');
  const [thumbFile,    setThumbFile]    = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [thumbPath,    setThumbPath]    = useState('');  // uploaded server path
  const [pipelineOk,   setPipelineOk]   = useState<boolean | null>(null);

  const job = useJobPoller(jobId);
  const slug = quiz?.slug || '';
  const isRunning = job?.status === 'running' || job?.status === 'pending';
  const isDone    = job?.status === 'done';
  const ttsRateStr = ttsRate >= 0 ? `+${ttsRate}%` : `${ttsRate}%`;

  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`).then(r => setPipelineOk(r.ok)).catch(() => setPipelineOk(false));
  }, []);

  useEffect(() => { if (quiz) setEditQs(quiz.questions); }, [quiz]);
  useEffect(() => { voicePreview?.pause(); setVoicePreview(null); setPreviewing(false); }, [voice, ttsRate]);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setGenerating(true); setGenErr(''); setQuiz(null); setJobId(null); setYtUrl('');
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/quiz/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numQuestions: numQ, difficulty, language }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      const d = await r.json();
      setQuiz(d.quiz);
    } catch (e: unknown) { setGenErr(e instanceof Error ? e.message : 'Failed'); }
    setGenerating(false);
  };

  const previewVoice = async () => {
    if (previewing) { voicePreview?.pause(); setPreviewing(false); setVoicePreview(null); return; }
    setPreviewing(true);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/quiz/preview-voice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, rate: ttsRateStr }),
      });
      if (!r.ok) throw new Error('Preview failed');
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setVoicePreview(audio);
      audio.play();
      audio.onended = () => { setPreviewing(false); URL.revokeObjectURL(url); };
    } catch { setPreviewing(false); }
  };

  const renderQuiz = async () => {
    if (!quiz) return;
    setRendering(true); setJobId(null); setYtUrl(''); setYtErr('');
    const finalQuiz = { ...quiz, topic, questions: editQs, voice, ttsRate: ttsRateStr, bgVideoPath };
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/quiz/render`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalQuiz),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.jobId);
    } catch (e: unknown) { alert('Render error: ' + (e instanceof Error ? e.message : 'unknown')); }
    setRendering(false);
  };

  const uploadYouTube = async () => {
    if (!quiz || !isDone) return;
    setYtUploading(true); setYtErr(''); setYtUrl('');
    try {
      // Upload user thumbnail first if provided
      let uploadedThumbPath = thumbPath;
      if (thumbFile && !uploadedThumbPath) {
        const fd = new FormData();
        fd.append('thumbnail', thumbFile);   // field name matches server
        fd.append('slug', `quiz-${quiz.slug}`);
        const tr = await fetch(`${PIPELINE_URL}/pipeline/upload-thumbnail`, { method: 'POST', body: fd });
        if (tr.ok) { const td = await tr.json(); uploadedThumbPath = td.path || ''; setThumbPath(td.path || ''); }
      }
      const r = await fetch(`${PIPELINE_URL}/pipeline/quiz/upload-youtube`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug:          quiz.slug,
          topic,
          numQuestions:  editQs.length,
          thumbnailPath: uploadedThumbPath || '',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      setYtUrl(d.youtubeUrl);
    } catch (e: unknown) { setYtErr(e instanceof Error ? e.message : 'Upload failed'); }
    setYtUploading(false);
  };

  const addQuestion = () => {
    setEditQs(prev => [...prev, {
      id: Date.now(), question: 'New question?', difficulty: 'medium', category: topic,
      options: [
        { label: 'A', text: 'Option A', correct: true },
        { label: 'B', text: 'Option B', correct: false },
        { label: 'C', text: 'Option C', correct: false },
        { label: 'D', text: 'Option D', correct: false },
      ],
      explanation: 'Explanation here.',
    }]);
  };

  const PER_Q_SEC = (40 + 72 + 90 + 90 + 30) / 30;
  const totalSec  = Math.round(2 + editQs.length * PER_Q_SEC + 2);
  const totalMin  = Math.floor(totalSec / 60);
  const totalRemS = totalSec % 60;

  const VOICES = [
    { id: 'en-IN-NeerjaExpressiveNeural', label: '🇮🇳 Neerja (Indian, Expressive)' },
    { id: 'en-IN-PrabhatNeural',          label: '🇮🇳 Prabhat (Indian Male)' },
    { id: 'hi-IN-MadhurNeural',           label: '🇮🇳 Madhur (Hindi Male)' },
    { id: 'hi-IN-SwaraNeural',            label: '🇮🇳 Swara (Hindi Female)' },
    { id: 'en-US-JennyNeural',            label: '🇺🇸 Jenny (US Female)' },
    { id: 'en-GB-SoniaNeural',            label: '🇬🇧 Sonia (UK Female)' },
  ];

  const EXAMPLE_TOPICS = ['Indian History','Cricket Facts','Science for Kids','Bollywood Trivia','General Knowledge','Space & Planets'];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">

      {/* Pipeline status */}
      <div className={`border rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs ${pipelineOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
        <div className={`w-2 h-2 rounded-full ${pipelineOk ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        {pipelineOk ? 'Pipeline online ✓' : 'Pipeline offline — run: npm run pipeline'}
      </div>

      {/* Topic input */}
      <Card>
        <div className="px-5 pt-5 pb-2">
          <h2 className="font-black text-gray-900 text-base mb-0.5">🧠 Quiz Video Creator</h2>
          <p className="text-gray-400 text-xs">AI generates animated quiz questions — free, no API costs, pure Remotion.</p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-4">

          {/* Topic */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Quiz Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Indian History, Cricket, Space, GK..."
              className="w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          {/* Config row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Questions</label>
              <select value={numQ} onChange={e => setNumQ(parseInt(e.target.value))}
                className="w-full border border-gray-200 text-gray-700 bg-gray-50 px-3 py-2 rounded-xl text-sm">
                {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full border border-gray-200 text-gray-700 bg-gray-50 px-3 py-2 rounded-xl text-sm">
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="w-full border border-gray-200 text-gray-700 bg-gray-50 px-3 py-2 rounded-xl text-sm">
                <option value="english">English</option>
                <option value="hindi">हिंदी</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>
          </div>

          {/* ── Voice Settings box ── */}
          <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-indigo-700 uppercase tracking-wider">🎙️ Voice Settings</label>
              <button onClick={previewVoice} disabled={pipelineOk !== true}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  previewing ? 'bg-indigo-500 text-white border-indigo-500' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-100 bg-white'
                } disabled:opacity-40`}>
                {previewing ? '⏹ Stop' : '▶ Test Voice'}
              </button>
            </div>

            <select value={voice} onChange={e => setVoice(e.target.value)}
              className="w-full border border-gray-200 text-gray-700 bg-white px-3 py-2 rounded-xl text-sm">
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-600">Speaking Speed</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-600 w-12 text-right">{ttsRateStr}</span>
                  <span className="text-[10px] text-gray-400 w-20">
                    {ttsRate < 0 ? 'Slower' : ttsRate === 0 ? 'Normal' : ttsRate < 20 ? 'Slightly fast' : ttsRate < 35 ? 'Fast' : 'Very fast'}
                  </span>
                </div>
              </div>
              <input type="range" min="-20" max="50" step="5" value={ttsRate}
                onChange={e => setTtsRate(parseInt(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                <span>Slow (-20%)</span><span>Normal (0%)</span><span>Fast (+50%)</span>
              </div>
            </div>
          </div>

          {/* Pexels BG video */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              🎬 Background Video <span className="text-gray-400 normal-case font-normal">(Pexels — free)</span>
            </label>
            {bgVideoPath && (
              <div className="flex items-center gap-3 bg-indigo-50 border-2 border-indigo-300 rounded-xl p-3 mb-3">
                {bgVideoThumb && <img src={bgVideoThumb} alt="bg" className="w-16 h-11 object-cover rounded-lg flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-indigo-700">✓ Background video ready</p>
                  <p className="text-[10px] text-gray-500 truncate">{bgVideoPath}</p>
                </div>
                <button onClick={() => { setBgVideoPath(''); setBgVideoThumb(''); }}
                  className="text-red-400 text-xs border border-red-200 px-2 py-1 rounded-lg">✕</button>
              </div>
            )}
            <PexelsVideoBrowser defaultQuery={topic}
              onSelect={(path, thumb) => { setBgVideoPath(path); setBgVideoThumb(thumb); }} />
            {!bgVideoPath && <p className="text-[10px] text-gray-400 mt-1.5">Optional — dark gradient used if none selected.</p>}
          </div>

          {/* Duration */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-indigo-500">⏱</span>
            <span className="text-xs font-bold text-indigo-700">~{totalMin > 0 ? `${totalMin}m ` : ''}{totalRemS}s estimated</span>
            <span className="ml-auto text-[10px] text-indigo-400">Shorts ≤60s for ≤5 questions</span>
          </div>

          {genErr && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">{genErr}</div>}

          <button onClick={generateQuiz} disabled={!topic.trim() || generating || pipelineOk !== true}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {generating ? <><span className="animate-spin">✨</span> AI is generating questions…</> : <><span>🧠</span> Generate Quiz with AI</>}
          </button>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_TOPICS.map(ex => (
              <button key={ex} onClick={() => setTopic(ex)}
                className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full bg-white transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Questions editor */}
      {quiz && !isRunning && (
        <>
          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-indigo-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🧠</span>
                <span className="font-black text-gray-800 text-sm">{quiz.title}</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {editQs.length} questions
                </span>
              </div>
              <button onClick={() => { setQuiz(null); setJobId(null); setYtUrl(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg bg-white">
                ✏ New topic
              </button>
            </div>
            <div className="px-4 py-3 grid grid-cols-4 gap-2 text-center text-xs">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <div key={d} className={`rounded-xl py-2 border ${DIFF_COLORS[d]}`}>
                  <div className="font-black text-lg">{editQs.filter(q => q.difficulty === d).length}</div>
                  <div className="capitalize text-[10px]">{d}</div>
                </div>
              ))}
              <div className="rounded-xl py-2 border border-indigo-100 bg-indigo-50 text-indigo-700">
                <div className="font-black text-lg">{totalMin > 0 ? `${totalMin}m${totalRemS}s` : `${totalRemS}s`}</div>
                <div className="text-[10px]">duration</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="font-bold text-gray-800 text-sm">✏️ Edit Questions</span>
              <button onClick={addQuestion}
                className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold">
                + Add Question
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {editQs.map((q, i) => (
                <QuestionCard key={q.id} q={q} index={i} total={editQs.length}
                  onChange={updated => setEditQs(prev => prev.map((x, j) => j === i ? updated : x))}
                  onDelete={() => setEditQs(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </Card>

          <button onClick={renderQuiz} disabled={rendering || isRunning}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-base py-4 rounded-xl transition-all flex items-center justify-center gap-2">
            {rendering ? <><span className="animate-spin">⚙️</span> Starting render…</> : <><span>🚀</span> Render Quiz Video</>}
          </button>
        </>
      )}

      {/* Job progress */}
      {jobId && (
        job
          ? <>
              <QuizJobProgress job={job} slug={slug} />

              {/* YouTube upload — shown after render done */}
              {isDone && (
                <Card>
                  <div className="px-5 pt-4 pb-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                      <span className="text-base">📤</span>
                      <span className="font-black text-gray-800 text-sm">Publish to YouTube</span>
                      <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full ml-auto">Auto SEO + Thumbnail</span>
                    </div>

                    {ytUrl ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-green-600 text-xl">✅</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-green-700">Uploaded successfully!</p>
                          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate block">{ytUrl}</a>
                        </div>
                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex-shrink-0 font-bold">
                          Watch ↗
                        </a>
                      </div>
                    ) : (
                      <>
                        {/* Thumbnail upload */}
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            🖼️ Custom Thumbnail <span className="normal-case font-normal text-gray-400">(optional — auto-generated from video if skipped)</span>
                          </label>
                          {thumbPreview ? (
                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={thumbPreview} alt="thumb" className="w-24 h-14 object-cover rounded-lg flex-shrink-0 border border-gray-200" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-700">{thumbFile?.name}</p>
                                <p className="text-[10px] text-gray-400">{thumbFile ? `${Math.round(thumbFile.size / 1024)}KB` : ''}</p>
                              </div>
                              <button onClick={() => { setThumbFile(null); setThumbPreview(''); setThumbPath(''); }}
                                className="text-red-400 text-xs border border-red-200 px-2 py-1 rounded-lg">✕</button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                              <span className="text-2xl">🖼️</span>
                              <div>
                                <p className="text-sm font-bold text-gray-600">Upload thumbnail</p>
                                <p className="text-[10px] text-gray-400">JPG/PNG, 1280×720 recommended</p>
                              </div>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  setThumbFile(f);
                                  setThumbPreview(URL.createObjectURL(f));
                                }} />
                            </label>
                          )}
                        </div>

                        {/* SEO info */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
                          <p className="font-bold mb-1">✨ What happens when you upload:</p>
                          <ul className="flex flex-col gap-0.5 text-indigo-600">
                            <li>• GPT-4o-mini writes a viral title, 400-word SEO description + 20 tags</li>
                            <li>• Auto-extracts a branded frame from the video as thumbnail (if no custom one)</li>
                            <li>• Uploads as Public #Shorts with full metadata</li>
                          </ul>
                        </div>

                        {ytErr && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">❌ {ytErr}</p>}

                        <button onClick={uploadYouTube} disabled={ytUploading}
                          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                          {ytUploading
                            ? <><span className="animate-spin">⚙️</span> Generating SEO + Uploading…</>
                            : <><span>▶</span> Upload to YouTube with Auto SEO</>}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center">
                          Connected to your YouTube account · Posted as Public Shorts
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              )}
            </>
          : <Card>
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="animate-spin text-xl">⚙️</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Starting quiz render…</p>
                  <p className="text-xs text-gray-400 mt-0.5">Generating voices and rendering</p>
                </div>
              </div>
            </Card>
      )}
    </div>
  );
}
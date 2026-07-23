'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type VideoType    = 'tw-short' | 'text-image' | 'news-flash';
type Voice        = 'en-US-AndrewNeural'|'en-US-AriaNeural'|'en-US-GuyNeural'|'en-US-JennyNeural';
type AccentColor  = '#E50914'|'#38BDF8'|'#A78BFA'|'#34D399'|'#FFD700'|'#FF6B6B';
type ImageMotion  = 'zoom-in'|'zoom-out'|'pan-left'|'pan-right'|'none';

const CATEGORIES = ['AI & TECH','BUSINESS','WORLD NEWS','SCIENCE','INNOVATION','SOCIAL MEDIA','EDUCATION','HEALTH'];
const VOICES: {id:Voice;label:string}[] = [
  {id:'en-US-AndrewNeural', label:'Andrew – Professional Male'},
  {id:'en-US-AriaNeural',   label:'Aria – Warm Female'},
  {id:'en-US-GuyNeural',    label:'Guy – Confident Male'},
  {id:'en-US-JennyNeural',  label:'Jenny – Friendly Female'},
];
const ACCENTS: {color:AccentColor;label:string}[] = [
  {color:'#E50914',label:'🔴 TW Red'},{color:'#38BDF8',label:'🔵 Electric Blue'},
  {color:'#A78BFA',label:'🟣 Purple'},{color:'#34D399',label:'🟢 Green'},
  {color:'#FFD700',label:'🟡 Gold'}, {color:'#FF6B6B',label:'🩷 Pink'},
];

type VideoScript = {
  slug:string; videoType:VideoType;
  hookLine:string; hookSub:string; factLine:string;
  voiceHook:string; voiceFact:string; voiceCta:string;
  category:string; accentColor:AccentColor; voice:Voice;
  bgMusic:boolean; imageUrl:string; imageMotion:ImageMotion;
  title:string; description:string; hashtags:string; uploadToYT:boolean;
};

const DEFAULT: VideoScript = {
  slug:'', videoType:'tw-short',
  hookLine:'', hookSub:'', factLine:'',
  voiceHook:'', voiceFact:'',
  voiceCta:'Subscribe to TrendingWires for daily AI and tech updates.',
  category:'AI & TECH', accentColor:'#E50914', voice:'en-US-AndrewNeural',
  bgMusic:true, imageUrl:'', imageMotion:'zoom-in',
  title:'', description:'', hashtags:'#TrendingWires #Shorts', uploadToYT:false,
};

function toSlug(t:string){return t.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,60);}

const PIPELINE_URL = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:3333';

// ─── UI primitives (white theme) ─────────────────────────────────────────────
const Card = ({children,className=''}:{children:React.ReactNode;className?:string}) => (
  <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({icon,title}:{icon:string;title:string}) => (
  <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
    <span className="text-lg">{icon}</span>
    <span className="font-bold text-gray-800 text-sm">{title}</span>
  </div>
);
const CardBody = ({children,className=''}:{children:React.ReactNode;className?:string}) => (
  <div className={`px-5 py-4 flex flex-col gap-4 ${className}`}>{children}</div>
);
const FieldLabel = ({children,optional}:{children:React.ReactNode;optional?:boolean}) => (
  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
    {children} {optional&&<span className="text-gray-300 font-normal normal-case tracking-normal">optional</span>}
  </label>
);
const FInput = (p:React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all placeholder:text-gray-300 ${p.className||''}`}/>
);
const FTextarea = (p:React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all placeholder:text-gray-300 resize-none ${p.className||''}`}/>
);
const FSelect = (p:React.SelectHTMLAttributes<HTMLSelectElement>&{children:React.ReactNode}) => (
  <select {...p} className={`w-full border border-gray-200 text-gray-800 bg-gray-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all ${p.className||''}`}/>
);
const Toggle = ({on,onChange,label}:{on:boolean;onChange:(v:boolean)=>void;label:string}) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${on?'bg-red-500':'bg-gray-200'}`} onClick={()=>onChange(!on)}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${on?'left-5':'left-0.5'}`}/>
    </div>
    <span className="text-sm text-gray-600">{label}</span>
  </label>
);
const Badge = ({color,children}:{color:string;children:React.ReactNode}) => (
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
);

// ─── Job poller ───────────────────────────────────────────────────────────────
type JobResult = {youtubeUrl?:string;videoPath?:string;thumbPath?:string};
type Job = {id:string;status:string;log:{msg:string}[];result:JobResult|null;error:string|null;script:VideoScript};

function useJobPoller(jobId:string|null) {
  const [job, setJob] = useState<Job|null>(null);
  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`${PIPELINE_URL}/pipeline/status/${jobId}`);
        if (!r.ok || !alive) return;
        const d:Job = await r.json();
        setJob(d);
        if ((d.status==='running'||d.status==='pending') && alive) setTimeout(poll,1500);
      } catch { if (alive) setTimeout(poll,3000); }
    };
    poll();
    return () => { alive=false; };
  }, [jobId]);
  return job;
}

// ─── YouTube Auth status ──────────────────────────────────────────────────────
function YouTubeAuthBanner({pipelineOk}:{pipelineOk:boolean|null}) {
  const [ytStatus, setYtStatus] = useState<'checking'|'authed'|'not-authed'|'no-creds'>('checking');

  const check = useCallback(async () => {
    if (!pipelineOk) return;
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/yt-status`);
      const d = await r.json();
      setYtStatus(d.status);
    } catch { setYtStatus('not-authed'); }
  }, [pipelineOk]);

  useEffect(() => { check(); }, [check]);

  if (pipelineOk === false || ytStatus === 'checking') return null;

  if (ytStatus === 'authed') return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
      <span className="text-green-600 text-sm">✅</span>
      <span className="text-green-700 text-sm font-medium">YouTube connected — uploads will publish automatically</span>
    </div>
  );

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
        <div>
          <p className="text-amber-700 text-sm font-medium">
            {ytStatus==='no-creds' ? 'YouTube credentials not set in .env' : 'YouTube not authorized yet'}
          </p>
          <p className="text-amber-600 text-xs mt-0.5">
            {ytStatus==='no-creds'
              ? 'Add YT_CLIENT_ID and YT_CLIENT_SECRET to your .env file'
              : <>Run <code className="bg-amber-100 px-1 rounded font-mono">npm run auth:youtube</code> in terminal to connect</>}
          </p>
        </div>
        <button onClick={check} className="ml-auto text-xs text-amber-500 hover:text-amber-700 flex-shrink-0">↻ Recheck</button>
      </div>
    </div>
  );
}

// ─── AI Research button ───────────────────────────────────────────────────────
function AIResearchPanel({onFill,pipelineOk}:{onFill:(s:Partial<VideoScript>)=>void;pipelineOk:boolean|null}) {
  const [topic,  setTopic]  = useState('');
  const [loading,setLoading]= useState(false);
  const [err,    setErr]    = useState('');

  const research = async () => {
    if (!topic.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/research`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({topic}),
      });
      if (!r.ok) { setErr('Research failed. Check pipeline server logs.'); setLoading(false); return; }
      const d = await r.json();
      onFill(d.script);
    } catch(e) { setErr('Pipeline server not running. Start it with: npm run pipeline'); }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader icon="🤖" title="AI Research — Fill Everything Automatically" />
      <CardBody>
        <p className="text-xs text-gray-500">Enter a topic. AI researches it and fills all script fields, title, description, hashtags, and finds an image.</p>
        <div className="flex gap-2">
          <FInput
            value={topic}
            onChange={e=>setTopic(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&research()}
            placeholder="e.g. Claude 4 beats GPT-4o on every benchmark"
            className="flex-1"
          />
          <button onClick={research} disabled={loading||!topic.trim()||pipelineOk!==true}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex-shrink-0 flex items-center gap-2">
            {loading ? <><span className="animate-spin">⚙️</span> Researching…</> : <><span>✨</span> Auto-Fill</>}
          </button>
        </div>
        {err && <p className="text-red-500 text-xs">{err}</p>}
      </CardBody>
    </Card>
  );
}

// ─── Main Studio ──────────────────────────────────────────────────────────────
export function VideoStudio() {
  const [form,       setForm]       = useState<VideoScript>(DEFAULT);
  const [jobId,      setJobId]      = useState<string|null>(null);
  const [voiceJobId, setVoiceJobId] = useState<string|null>(null);
  const [running,    setRunning]    = useState(false);
  const [pipelineOk, setPipelineOk] = useState<boolean|null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const job      = useJobPoller(jobId);
  const voiceJob = useJobPoller(voiceJobId);

  const isDone    = job?.status==='done';
  const isRunning = job?.status==='running'||job?.status==='pending';
  const isFailed  = job?.status==='error';
  const slug      = form.slug || toSlug(form.title||form.hookLine||'preview');

  // Check pipeline health
  useEffect(() => {
    fetch(`${PIPELINE_URL}/health`).then(r=>setPipelineOk(r.ok)).catch(()=>setPipelineOk(false));
  }, []);

  const set = <K extends keyof VideoScript>(k:K,v:VideoScript[K]) => setForm(f=>({...f,[k]:v}));

  const autoFill = (patch:Partial<VideoScript>) => {
    setForm(f => {
      const merged = {...f,...patch};
      if (patch.title && !f.slug) merged.slug = toSlug(patch.title);
      return merged;
    });
  };

  const autoDesc = () => set('description', [
    form.factLine||form.hookLine,'',
    '─────────','0:00 Hook','0:04 The Fact','0:12 Subscribe','─────────','',
    '🌐 https://trendingwires.com',
    '📺 https://youtube.com/@trendingwires?sub_confirmation=1',
    '📸 https://instagram.com/trending_wires',
    '','',form.hashtags||'#TrendingWires #Shorts',
  ].join('\n'));

  const previewVoice = async () => {
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/voice-only`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,_noUpload:true})});
      const d = await r.json();
      setVoiceJobId(d.jobId);
    } catch { alert('Pipeline server offline. Run: npm run pipeline'); }
  };

  const run = async () => {
    if (!form.hookLine||!form.voiceHook){alert('Fill in Hook Line and Voice Hook at minimum.');return;}
    setRunning(true); setJobId(null);
    try {
      const r = await fetch(`${PIPELINE_URL}/pipeline/run`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...form,slug:form.slug||toSlug(form.title||form.hookLine),_noUpload:!form.uploadToYT})});
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.jobId);
    } catch(e:unknown){alert(`Failed: ${e instanceof Error?e.message:'Unknown'}\n\nStart pipeline: npm run pipeline`);}
    setRunning(false);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Pipeline status */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${pipelineOk===true?'bg-green-500':pipelineOk===false?'bg-red-400':'bg-yellow-400 animate-pulse'}`}/>
          <span className="text-xs text-gray-500">
            Pipeline server {pipelineOk===true?<span className="text-green-600 font-medium">online</span>:pipelineOk===false?<span className="text-red-500 font-medium">offline — run: npm run pipeline</span>:'checking…'}
          </span>
        </div>
        <button onClick={()=>fetch(`${PIPELINE_URL}/health`).then(r=>setPipelineOk(r.ok)).catch(()=>setPipelineOk(false))} className="text-xs text-gray-400 hover:text-gray-600">↻</button>
      </div>

      <YouTubeAuthBanner pipelineOk={pipelineOk} />

      {/* AI Research */}
      <AIResearchPanel onFill={autoFill} pipelineOk={pipelineOk} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-5">

          {/* Video type */}
          <Card>
            <CardHeader icon="🎬" title="Video Type" />
            <CardBody>
              <div className="grid grid-cols-3 gap-2">
                {([['tw-short','⚡ TW Short','Hook → Fact → CTA'],['text-image','🖼️ Text + Image','Image with motion'],['news-flash','📡 News Flash','Breaking news style']] as const).map(([id,label,desc])=>(
                  <button key={id} onClick={()=>set('videoType',id)}
                    className={`p-3 rounded-xl border text-left transition-all ${form.videoType===id?'border-red-400 bg-red-50':'border-gray-200 hover:border-gray-300 bg-white'}`}>
                    <div className={`text-sm font-bold ${form.videoType===id?'text-red-600':'text-gray-700'}`}>{label}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Script content */}
          <Card>
            <CardHeader icon="📝" title="Script Content" />
            <CardBody>
              <div className="flex flex-col gap-1">
                <FieldLabel>Hook Line * <span className="text-gray-300 font-normal text-xs normal-case">(ALL CAPS, \n for line break)</span></FieldLabel>
                <FTextarea value={form.hookLine} onChange={e=>set('hookLine',e.target.value)} rows={2} placeholder={"KIRO BUILDS\nAI AGENTS"}/>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel optional>Hook Subtitle</FieldLabel>
                <FInput value={form.hookSub} onChange={e=>set('hookSub',e.target.value)} placeholder="And it takes under 10 minutes."/>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Fact Line * <span className="text-gray-300 font-normal text-xs normal-case">(\n for line break)</span></FieldLabel>
                <FTextarea value={form.factLine} onChange={e=>set('factLine',e.target.value)} rows={2} placeholder={"Describe in plain English.\nKiro writes specs, plan, and code."}/>
              </div>
              {form.videoType==='text-image' && <>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Image URL *</FieldLabel>
                  <FInput value={form.imageUrl} onChange={e=>set('imageUrl',e.target.value)} placeholder="https://images.unsplash.com/... (auto-filled by AI)"/>
                </div>
                {form.imageUrl && <img src={form.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-xl border border-gray-200"/>}
                <div className="flex flex-col gap-1">
                  <FieldLabel>Image Motion</FieldLabel>
                  <FSelect value={form.imageMotion} onChange={e=>set('imageMotion',e.target.value as ImageMotion)}>
                    <option value="zoom-in">🔍 Zoom In (Ken Burns)</option>
                    <option value="zoom-out">🔎 Zoom Out</option>
                    <option value="pan-left">← Pan Left</option>
                    <option value="pan-right">→ Pan Right</option>
                    <option value="none">Static</option>
                  </FSelect>
                </div>
              </>}
            </CardBody>
          </Card>

          {/* Voice */}
          <Card>
            <CardHeader icon="🎙️" title="Voice Script" />
            <CardBody>
              <div className="flex flex-col gap-1">
                <FieldLabel>Voice Hook *</FieldLabel>
                <FTextarea value={form.voiceHook} onChange={e=>set('voiceHook',e.target.value)} rows={2} placeholder="Kiro just changed how developers build AI agents."/>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Voice Fact *</FieldLabel>
                <FTextarea value={form.voiceFact} onChange={e=>set('voiceFact',e.target.value)} rows={2} placeholder="You describe it, Kiro writes the code automatically."/>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel optional>Voice CTA</FieldLabel>
                <FInput value={form.voiceCta} onChange={e=>set('voiceCta',e.target.value)}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Voice</FieldLabel>
                  <FSelect value={form.voice} onChange={e=>set('voice',e.target.value as Voice)}>
                    {VOICES.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
                  </FSelect>
                </div>
                <div className="flex items-end">
                  <button onClick={previewVoice} disabled={!form.voiceHook||pipelineOk!==true}
                    className="w-full border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-40 bg-white">
                    {voiceJob?.status==='running'?'⏳ Generating…':'▶ Preview Voice'}
                  </button>
                </div>
              </div>
              {voiceJob?.status==='done' && <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-600 text-xs font-medium">✅ Voice ready</div>}
            </CardBody>
          </Card>

          {/* Style */}
          <Card>
            <CardHeader icon="🎨" title="Style" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Category</FieldLabel>
                  <FSelect value={form.category} onChange={e=>set('category',e.target.value)}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </FSelect>
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Accent Color</FieldLabel>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENTS.map(a=>(
                      <button key={a.color} onClick={()=>set('accentColor',a.color)}
                        title={a.label}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${form.accentColor===a.color?'border-gray-800 scale-110':'border-transparent'}`}
                        style={{background:a.color}}/>
                    ))}
                  </div>
                </div>
              </div>
              <Toggle on={form.bgMusic} onChange={v=>set('bgMusic',v)} label="Background music (bgm.mp3)"/>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-5">

          {/* YouTube */}
          <Card>
            <CardHeader icon="📺" title="YouTube Details" />
            <CardBody>
              <div className="flex flex-col gap-1">
                <FieldLabel>Video Title *</FieldLabel>
                <FInput value={form.title} onChange={e=>{set('title',e.target.value);if(!form.slug)set('slug',toSlug(e.target.value));}} placeholder="I Built an AI Agent in Kiro — Here's How"/>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel optional>Slug (auto-filled)</FieldLabel>
                <FInput value={form.slug} onChange={e=>set('slug',toSlug(e.target.value))} className="font-mono text-xs"/>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <FieldLabel optional>Description</FieldLabel>
                  <button onClick={autoDesc} className="text-xs text-red-500 hover:text-red-600 font-medium">Auto-fill ↗</button>
                </div>
                <FTextarea value={form.description} onChange={e=>set('description',e.target.value)} rows={6} placeholder="YouTube description with chapters…"/>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel optional>Hashtags</FieldLabel>
                <FInput value={form.hashtags} onChange={e=>set('hashtags',e.target.value)} placeholder="#TrendingWires #Shorts #AI"/>
              </div>
              <Toggle on={form.uploadToYT} onChange={v=>set('uploadToYT',v)} label="Upload to YouTube after render"/>
              {form.uploadToYT && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-600 text-xs">
                  ℹ️ Requires YouTube OAuth. Run <code className="bg-blue-100 px-1 rounded font-mono">npm run auth:youtube</code> once.
                </div>
              )}
            </CardBody>
          </Card>

          {/* Run */}
          <button onClick={run} disabled={running||isRunning||pipelineOk!==true}
            className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-red-200 flex items-center justify-center gap-2">
            {isRunning?<><span className="animate-spin text-xl">⚙️</span>Pipeline Running…</>:
             running?<><span className="animate-pulse">⏳</span>Starting…</>:
             <><span>🚀</span>{form.uploadToYT?'Render & Publish to YouTube':'Render Video'}</>}
          </button>

          {/* Log */}
          {job && (
            <Card>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Pipeline Log</span>
                <Badge color={isDone?'bg-green-100 text-green-700':isFailed?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}>
                  {job.status.toUpperCase()}
                </Badge>
              </div>
              <div className="px-4 py-3 max-h-52 overflow-y-auto flex flex-col gap-1.5">
                {job.log.map((l,i)=>(
                  <div key={i} className={`text-xs font-mono ${l.msg.startsWith('✓')||l.msg.startsWith('🎉')?'text-green-600':l.msg.startsWith('❌')?'text-red-500':'text-gray-500'}`}>{l.msg}</div>
                ))}
                {isRunning&&<div className="text-xs text-amber-500 font-mono animate-pulse">● Processing…</div>}
                {isFailed&&<div className="text-xs text-red-500 mt-1 bg-red-50 rounded-lg p-2">❌ {job.error}</div>}
              </div>
            </Card>
          )}

          {/* Result */}
          {isDone && job?.result && (
            <Card>
              <CardHeader icon="🎉" title="Done! Your video is ready"/>
              <CardBody>
                {/* Video preview */}
                <div className="relative mx-auto w-40 rounded-2xl overflow-hidden bg-black border border-gray-200 shadow-lg" style={{aspectRatio:'9/16'}}>
                  <video ref={videoRef} src={`${PIPELINE_URL}/pipeline/preview/${slug}`} controls className="w-full h-full object-cover" preload="metadata"/>
                </div>
                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <a href={`${PIPELINE_URL}/pipeline/preview/${slug}`} download={`${slug}.mp4`}
                    className="border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors bg-white">
                    ⬇ Download MP4
                  </a>
                  {job.result.youtubeUrl ? (
                    <a href={job.result.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center transition-colors">
                      ▶ View on YouTube
                    </a>
                  ) : (
                    <div className="border border-gray-200 text-gray-400 text-xs py-2.5 px-4 rounded-xl text-center">
                      {form.uploadToYT?'Upload failed':'Upload disabled'}
                    </div>
                  )}
                </div>
                {job.result.youtubeUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                    <a href={job.result.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="text-green-600 text-xs font-bold hover:text-green-700 break-all">{job.result.youtubeUrl}</a>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

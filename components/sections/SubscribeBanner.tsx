'use client';
import { useState } from 'react';

export function SubscribeBanner() {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const url  = base ? `${base}/subscribe` : `/api/subscribe`;
      const res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setStatus('success'); setMessage(data.message || 'Subscribed!'); setEmail(''); }
      else         { setStatus('error');   setMessage(data.error   || 'Something went wrong.'); }
    } catch {
      setStatus('error'); setMessage('Network error. Please try again.');
    }
  };

  return (
    <section
      className="bg-tw-dark border-y border-tw-border py-16 px-4"
      aria-labelledby="subscribe-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        {/* Bell icon */}
        <div className="text-5xl mb-4">🔔</div>

        <h2 id="subscribe-heading" className="text-3xl sm:text-4xl font-black text-white mb-3">
          Never Miss a Trending Story
        </h2>
        <p className="text-gray-400 mb-8">
          Get notified when we drop new Shorts on AI, tech, business, world news and more.
          New videos every day.
        </p>

        {status === 'success' ? (
          <div className="bg-green-900/40 border border-green-500/40 text-green-400 rounded-xl px-6 py-4 font-semibold">
            ✅ {message}
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <label htmlFor="email-input" className="sr-only">Email address</label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 bg-tw-card border border-tw-border text-white placeholder-gray-500 px-4 py-3 rounded-full focus:outline-none focus:border-tw-red transition-colors"
              aria-label="Email address for newsletter"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-red disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'loading' ? 'Subscribing…' : 'Subscribe Free'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-400 text-sm mt-3">{message}</p>
        )}

        <p className="text-gray-600 text-xs mt-4">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}

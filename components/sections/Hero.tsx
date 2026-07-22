'use client';
import Link from 'next/link';

// Decorative SVG wave (matches brand art)
function WaveDecor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 30" className={className} fill="none" aria-hidden="true">
      <path d="M0 15 Q10 0 20 15 Q30 30 40 15 Q50 0 60 15 Q70 30 80 15"
        stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" />
    </svg>
  );
}

// Dot grid decoration
function DotGrid({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      {Array.from({ length: 25 }, (_, i) => (
        <circle key={i} cx={(i % 5) * 14 + 7} cy={Math.floor(i / 5) * 14 + 7}
          r="1.5" fill="rgba(255,255,255,0.2)" />
      ))}
    </svg>
  );
}

// Concentric rings — the star-swirl brand motif
function StarSwirl() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
      {[300, 450, 600, 750, 900].map((size, i) => (
        <div
          key={size}
          className="ring absolute animate-spin-slow"
          style={{
            width: size, height: size,
            animationDuration: `${30 + i * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            borderColor: `rgba(229,9,20,${0.06 - i * 0.01})`,
          }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden star-bg pt-16"
      aria-label="Hero section"
    >
      {/* Background swirl rings */}
      <StarSwirl />

      {/* Corner decorations */}
      <WaveDecor className="absolute top-24 left-6 w-20 opacity-40" />
      <WaveDecor className="absolute bottom-24 right-6 w-20 opacity-40" />
      <DotGrid  className="absolute top-32 right-8 w-16 opacity-50" />
      <DotGrid  className="absolute bottom-32 left-8 w-16 opacity-50" />

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Subscribe badge */}
        <a
          href="https://www.youtube.com/@trendingwires?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-tw-red text-white text-sm font-bold px-5 py-2 rounded-full mb-6 hover:bg-tw-redHover transition-all duration-300 hover:scale-105 animate-pulse-red"
          aria-label="Subscribe to TrendingWires on YouTube"
        >
          SUBSCRIBE NOW!
        </a>

        {/* Brand name */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none mb-4">
          <span className="text-white">TRENDING</span>{' '}
          <span className="text-white">WIRES</span>
          {/* YouTube icon inline */}
          <span className="inline-block ml-4 align-middle">
            <svg viewBox="0 0 48 34" className="w-12 h-9 sm:w-16 sm:h-12 inline" aria-label="YouTube">
              <rect width="48" height="34" rx="8" fill="#E50914" />
              <path d="M20 10 L34 17 L20 24 Z" fill="white" />
            </svg>
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mt-6 mb-8 leading-relaxed">
          Stay ahead with <strong className="text-white">bite-sized videos</strong> covering the
          world&apos;s most trending stories — AI, technology, business, science, world events,
          and viral moments in <strong className="text-tw-red">under 60 seconds.</strong>
        </p>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10" role="list" aria-label="Content categories">
          {[
            ['⚡', 'Trending'],
            ['🤖', 'AI & Tech'],
            ['💼', 'Business'],
            ['🌍', 'World'],
            ['📱', 'Social Media'],
            ['🚀', 'Innovation'],
          ].map(([icon, label]) => (
            <span
              key={label}
              role="listitem"
              className="flex items-center gap-1.5 bg-tw-card border border-tw-border text-sm text-gray-300 px-4 py-2 rounded-full"
            >
              {icon} {label}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://www.youtube.com/@trendingwires?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-red text-base flex items-center gap-2"
            aria-label="Subscribe to TrendingWires on YouTube"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
              <path d="M23.5 6.2s-.2-1.6-.9-2.3c-.9-.9-1.8-.9-2.3-1C17.6 2.7 12 2.7 12 2.7s-5.6 0-8.3.2c-.5.1-1.5.1-2.3 1-.7.7-.9 2.3-.9 2.3S.3 8 .3 9.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.7.2 7.7.2s5.6 0 8.3-.2c.5-.1 1.5-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.7 15.5V8.1l6.6 3.7-6.6 3.7z"/>
            </svg>
            Subscribe on YouTube
          </a>
          <Link
            href="#videos"
            className="border border-tw-border text-white px-6 py-3 rounded-full text-base font-bold hover:border-tw-red hover:text-tw-red transition-all duration-300"
          >
            Watch Now ↓
          </Link>
        </div>
      </div>
    </section>
  );
}
